const http = require('http');

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

async function runTests() {
  console.log('==================================================');
  console.log('🧪 DOCTRACK AI — ITERATION 14 VERIFICATION SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const testEmail = `newuser_${Date.now()}@doctrack.ai`;
  const testPassword = 'password123';
  const testName = 'Aarav Patel';
  const testPhone = '+91 99887 76655';

  // TEST 1: Register completely new user
  console.log('--- TEST GROUP 1: NEW USER REGISTRATION & ONBOARDING STATUS ---');
  const regRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { name: testName, email: testEmail, password: testPassword, phone: testPhone }
  );

  assert(regRes.status === 201, `Register HTTP status is 201 (got ${regRes.status})`);
  assert(regRes.body.token, 'Auth token returned on registration');
  assert(regRes.body.user?.onboardingCompleted === false, 'New user onboardingCompleted is false initially');

  const token = regRes.body.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // TEST 2: GET /api/auth/me verifies onboarding status
  const meRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: authHeaders
  });
  assert(meRes.status === 200, 'GET /api/auth/me returns 200');
  assert(meRes.body.user?.onboardingCompleted === false, 'Me endpoint reports onboardingCompleted === false');

  // TEST 3: POST /api/auth/complete-onboarding persists onboarding state
  const compRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/complete-onboarding',
    method: 'POST',
    headers: authHeaders
  });
  assert(compRes.status === 200, 'POST /api/auth/complete-onboarding returns 200');
  assert(compRes.body.onboardingCompleted === true, 'Response confirms onboardingCompleted === true');

  // TEST 4: Re-login as new user verifies onboarding persistence across sessions
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { email: testEmail, password: testPassword }
  );
  assert(loginRes.status === 200, 'Login HTTP status is 200');
  assert(loginRes.body.user?.onboardingCompleted === true, 'Persisted onboardingCompleted is true upon subsequent login');

  console.log('\n--- TEST GROUP 2: CLEAN NEW USER DATA (0 COUNTS & NO LEAKAGE) ---');
  // TEST 5: Verify fresh account has 0 documents
  const docsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/documents',
    method: 'GET',
    headers: authHeaders
  });
  assert(docsRes.status === 200, 'GET /api/documents returns 200');
  assert(Array.isArray(docsRes.body.data) && docsRes.body.data.length === 0, 'New user has exactly 0 documents');

  // TEST 6: Verify fresh account dashboard stats has real 0-counts
  const dashRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard/stats',
    method: 'GET',
    headers: authHeaders
  });
  assert(dashRes.status === 200, 'GET /api/dashboard/stats returns 200');
  const m = dashRes.body.data?.metrics;
  assert(m?.total === 0, `Total documents is 0 (got ${m?.total})`);
  assert(m?.active === 0, `Active documents is 0 (got ${m?.active})`);
  assert(m?.expiringSoon === 0, `Expiring soon is 0 (got ${m?.expiringSoon})`);
  assert(m?.expired === 0, `Expired documents is 0 (got ${m?.expired})`);

  console.log('\n--- TEST GROUP 3: PROFILES PROVISIONING & MULTI-PROFILE SUPPORT ---');
  // TEST 7: Profiles provisioning
  const profilesRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/profiles',
    method: 'GET',
    headers: authHeaders
  });
  assert(profilesRes.status === 200, 'GET /api/profiles returns 200');
  const userProfiles = profilesRes.body.data || [];
  assert(userProfiles.length === 1, `Fresh account has 1 provisioned profile (got ${userProfiles.length})`);
  assert(userProfiles[0]?.name === testName, `Default profile name matches registered name "${testName}" (got "${userProfiles[0]?.name}")`);
  assert(userProfiles[0]?.type === 'self', `Default profile type is "self" (got "${userProfiles[0]?.type}")`);
  assert(userProfiles[0]?.isPrimary === true, 'Default profile is marked as primary');

  const primaryProfileId = userProfiles[0].id;

  // TEST 8: Create additional multi-profiles: Family, Vehicle, Employee, Custom
  const createdProfiles = [];
  const profileTypesToTest = [
    { name: 'Diya Patel (Spouse)', type: 'family', relation: 'Spouse', description: 'Family vault for spouse' },
    { name: 'Hyundai Creta (DL01XY7890)', type: 'vehicle', relation: 'Family SUV', description: 'Vehicle RC, Insurance, PUC' },
    { name: 'Sanjay Kumar (Driver)', type: 'employee', relation: 'Chauffeur', description: 'Driver license & background verification' },
    { name: 'Apartment 402 (Residency)', type: 'custom', relation: 'Real Estate Property', description: 'Property tax, deed, agreement' }
  ];

  for (const p of profileTypesToTest) {
    const cpRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/profiles',
        method: 'POST',
        headers: authHeaders
      },
      p
    );
    assert(cpRes.status === 201, `Created profile of type "${p.type}" with status 201`);
    if (cpRes.body.data) createdProfiles.push(cpRes.body.data);
  }

  // Verify all 5 profiles now exist
  const allProfilesRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/profiles',
    method: 'GET',
    headers: authHeaders
  });
  assert(allProfilesRes.body.data?.length === 5, `Total user profiles count is 5 (got ${allProfilesRes.body.data?.length})`);

  console.log('\n--- TEST GROUP 4: DATA ISOLATION & ZERO CROSS-PROFILE LEAKAGE ---');
  // Upload a document explicitly scoped to Vehicle profile
  const vehicleProfile = createdProfiles.find((p) => p.type === 'vehicle');
  const boundary = '----WebKitFormBoundaryIteration14Test';
  const postData = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="title"',
    '',
    'Vehicle Comprehensive Insurance Policy',
    `--${boundary}`,
    'Content-Disposition: form-data; name="profileId"',
    '',
    vehicleProfile.id,
    `--${boundary}`,
    'Content-Disposition: form-data; name="categoryId"',
    '',
    'vehicle',
    `--${boundary}`,
    'Content-Disposition: form-data; name="category"',
    '',
    'Vehicle Records',
    `--${boundary}`,
    'Content-Disposition: form-data; name="expiryDate"',
    '',
    '2027-10-15',
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="insurance.pdf"',
    'Content-Type: application/pdf',
    '',
    '%PDF-1.4\n1 0 obj\n<< /Title (Vehicle Insurance) >>\nendobj\ntrailer\n<<>>\n%%EOF',
    `--${boundary}--`
  ].join('\r\n');

  const upRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/documents/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${token}`
      }
    },
    postData
  );
  assert(upRes.status === 201, `Document uploaded under vehicle profile (status ${upRes.status})`);

  // Query documents for vehicle profile -> should return 1
  const vehDocsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/documents?profileId=${vehicleProfile.id}`,
    method: 'GET',
    headers: authHeaders
  });
  assert(vehDocsRes.body.data?.length === 1, `Vehicle profile has 1 document (got ${vehDocsRes.body.data?.length})`);

  // Query documents for primary self profile -> MUST return 0 (NO LEAKAGE)
  const selfDocsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/documents?profileId=${primaryProfileId}`,
    method: 'GET',
    headers: authHeaders
  });
  assert(selfDocsRes.body.data?.length === 0, `Self profile has 0 documents (zero cross-profile leakage, got ${selfDocsRes.body.data?.length})`);

  // Query dashboard stats for vehicle profile vs self profile
  const vehDash = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/dashboard/stats?profileId=${vehicleProfile.id}`,
    method: 'GET',
    headers: authHeaders
  });
  assert(vehDash.body.data?.metrics?.total === 1, `Vehicle profile dashboard metrics.total === 1 (got ${vehDash.body.data?.metrics?.total})`);

  const selfDash = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/dashboard/stats?profileId=${primaryProfileId}`,
    method: 'GET',
    headers: authHeaders
  });
  assert(selfDash.body.data?.metrics?.total === 0, `Self profile dashboard metrics.total === 0 (got ${selfDash.body.data?.metrics?.total})`);

  console.log('\n--- TEST GROUP 5: DEMO ACCOUNT BACKWARDS COMPATIBILITY ---');
  const demoLoginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { email: 'zaid@doctrack.ai', password: 'password123' }
  );
  assert(demoLoginRes.status === 200, 'Demo user login HTTP 200');
  assert(demoLoginRes.body.user?.onboardingCompleted === true, 'Demo user has onboardingCompleted: true');

  console.log('\n==================================================');
  console.log(`🏁 ITERATION 14 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
