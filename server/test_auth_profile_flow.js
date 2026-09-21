const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const opts = {
      ...options,
      headers: {
        'x-bypass-ratelimit': 'test-secret',
        ...(options.headers || {})
      }
    };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function testAuthProfileFlow() {
  console.log('==================================================');
  console.log('🧪 DOCTRACK AI — AUTH & PROFILE ALLOCATION TEST');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  const testEmail = `user_${Date.now()}@doctrack.test`;
  const testPassword = 'mySecretPassword99!';
  const testName = 'Priya Sharma';

  // 1. Register Account
  console.log('--- 1. REGISTER NEW USER ---');
  const regRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { name: testName, email: testEmail, password: testPassword }
  );

  assert(regRes.status === 201, `Register status is 201 Created (got ${regRes.status})`);
  assert(regRes.body.token, 'Token returned upon registration');
  assert(regRes.body.user?.email === testEmail, 'Returned user email matches');
  assert(regRes.body.profile, 'Allocated profile returned upon registration');
  assert(regRes.body.profile?.isPrimary === true, 'Allocated profile is primary vault');
  assert(regRes.body.profile?.name === testName, `Allocated profile name is "${testName}"`);

  const token = regRes.body.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // 2. Fetch Profiles with Auth Token
  console.log('\n--- 2. VERIFY ALLOCATED PROFILE ACCESS ---');
  const profRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/profiles',
    method: 'GET',
    headers: authHeaders
  });

  assert(profRes.status === 200, 'GET /api/profiles returns 200');
  const userProfiles = profRes.body.data || [];
  assert(userProfiles.length >= 1, `User has at least 1 allocated profile (got ${userProfiles.length})`);
  assert(userProfiles[0].name === testName, `Primary profile matches user name "${testName}"`);

  // 3. Test Login with Wrong Password
  console.log('\n--- 3. TEST SIGN-IN WITH CREDENTIALS ---');
  const wrongLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { email: testEmail, password: 'incorrectPassword123' }
  );
  assert(wrongLogin.status === 401, `Wrong password rejected with 401 (got ${wrongLogin.status})`);

  // 4. Test Login with Correct Credentials
  const goodLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { email: testEmail, password: testPassword }
  );
  assert(goodLogin.status === 200, `Correct credentials accepted with 200 (got ${goodLogin.status})`);
  assert(goodLogin.body.token, 'New JWT session token returned upon login');
  assert(goodLogin.body.profiles && goodLogin.body.profiles.length >= 1, 'Allocated profiles returned upon login');

  // 5. Verify Disk Persistence
  console.log('\n--- 4. VERIFY LOCAL DISK PERSISTENCE ---');
  const dbFile = path.join(__dirname, 'data', 'db.json');
  assert(fs.existsSync(dbFile), `Database file exists on disk at ${dbFile}`);
  if (fs.existsSync(dbFile)) {
    const raw = fs.readFileSync(dbFile, 'utf8');
    const parsed = JSON.parse(raw);
    const foundUser = parsed.users?.find(u => u.email === testEmail);
    assert(foundUser !== undefined, `User credentials persistently saved to disk (${testEmail})`);
    assert(foundUser?.passwordHash && foundUser.passwordHash.startsWith('$2'), 'Password hash is securely encrypted with bcrypt');
    const foundProfile = parsed.profiles?.find(p => p.userId === foundUser?.id);
    assert(foundProfile !== undefined, `Allocated profile persistently saved to disk (${foundProfile?.name})`);
  }

  console.log('\n==================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

testAuthProfileFlow().catch(err => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
