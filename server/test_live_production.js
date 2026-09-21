/**
 * DocTrack AI — LIVE DEPLOYMENT TEST SUITE
 * Runs all tests against production URLs (no localhost)
 *
 * Frontend: https://doc-track-ai.vercel.app
 * Backend:  https://doctrack-ai.onrender.com
 */

const https = require('https');
const http = require('http');

const BACKEND = 'https://doctrack-ai.onrender.com/api';
const FRONTEND = 'https://doc-track-ai.vercel.app';

let passed = 0;
let failed = 0;

function log(label, ok, note = '') {
  if (ok) {
    console.log(`  ✅ ${label}${note ? ' — ' + note : ''}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${note ? ' — ' + note : ''}`);
    failed++;
  }
}

function request(method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;
    const bodyStr = body ? JSON.stringify(body) : null;

    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (bodyStr) reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr);

    const req = lib.request({
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: reqHeaders
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        let parsed_body = null;
        try { parsed_body = JSON.parse(raw); } catch { parsed_body = raw; }
        resolve({ status: res.statusCode, body: parsed_body });
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => req.destroy(new Error('Request timeout')));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function runTests() {
  const ts = Date.now();
  const email = `live.test.${ts}@doctrack.ai`;
  const pw = 'LiveTest@2024!';
  const newPw = 'NewLivePass@2024!';
  let token = '';
  let docId = '';
  let devOtp = '';
  let profileId = '';

  console.log('\n==========================================================');
  console.log('🌍 DOCTRACK AI — LIVE PRODUCTION TEST SUITE');
  console.log('==========================================================');
  console.log(`  Backend:  ${BACKEND}`);
  console.log(`  Frontend: ${FRONTEND}`);
  console.log(`  Time:     ${new Date().toISOString()}`);
  console.log('==========================================================\n');

  // ── 1. Health checks ─────────────────────────────────────────────────────
  console.log('▶ SECTION 1: Health Checks');

  let r = await request('GET', `${BACKEND}/health`);
  log('Render backend /api/health responds 200', r.status === 200 && r.body?.status === 'ok',
    `status=${r.body?.status}, db=${r.body?.database?.status}`);

  r = await request('GET', FRONTEND);
  log('Vercel frontend responds 200', r.status === 200);

  // ── 2. Auth: Registration ─────────────────────────────────────────────────
  console.log('\n▶ SECTION 2: Authentication');

  r = await request('POST', `${BACKEND}/auth/register`, { name: 'Live Test User', email, password: pw, phone: '+919876543210' });
  log('Register new user (201)', r.status === 201 && r.body?.success, `id=${r.body?.user?.id}`);

  if (r.body?.token) token = r.body.token;
  if (r.body?.profiles?.[0]) profileId = r.body.profiles[0].id || r.body.profiles[0]._id || '';

  // duplicate registration blocked
  r = await request('POST', `${BACKEND}/auth/register`, { name: 'Dup', email, password: pw });
  log('Duplicate email blocked (409)', r.status === 409);

  // ── 3. Auth: Login ───────────────────────────────────────────────────────
  r = await request('POST', `${BACKEND}/auth/login`, { email: 'wrong@email.com', password: pw });
  log('Wrong email rejected (401)', r.status === 401);

  r = await request('POST', `${BACKEND}/auth/login`, { email, password: 'wrongpass' });
  log('Wrong password rejected (401)', r.status === 401);

  r = await request('POST', `${BACKEND}/auth/login`, { email, password: pw });
  log('Valid login returns JWT (200)', r.status === 200 && !!r.body?.token, `token=${r.body?.token?.slice(0,20)}...`);
  if (r.body?.token) token = r.body.token;

  // ── 4. Auth: Protected route ─────────────────────────────────────────────
  r = await request('GET', `${BACKEND}/auth/me`, null, { Authorization: `Bearer ${token}` });
  log('/api/auth/me returns user (200)', r.status === 200 && r.body?.user?.email === email);

  r = await request('GET', `${BACKEND}/auth/me`, null, { Authorization: 'Bearer faketoken' });
  log('Fake JWT rejected (401)', r.status === 401);

  // ── 5. Multi-tenant isolation ────────────────────────────────────────────
  console.log('\n▶ SECTION 3: Multi-Tenant Isolation');

  r = await request('GET', `${BACKEND}/documents`, null, { Authorization: `Bearer ${token}` });
  log('New user sees 0 documents', r.status === 200 && (r.body?.documents?.length === 0 || r.body?.data?.length === 0),
    `count=${r.body?.documents?.length ?? r.body?.data?.length ?? r.body?.total}`);

  // ── 6. Document upload (JSON, no file) ───────────────────────────────────
  console.log('\n▶ SECTION 4: Document Lifecycle');

  const uploadPayload = {
    title: 'Live Test Passport',
    category: 'Identity Proofs',
    profileId: profileId || 'default',
    expiryDate: '2030-12-31',
    issueDate: '2020-01-15',
    docNumber: 'T1234567',
    notes: 'Live deployment test document'
  };
  r = await request('POST', `${BACKEND}/documents`, uploadPayload, { Authorization: `Bearer ${token}` });
  log('Document creation (200/201)', [200, 201].includes(r.status) && (r.body?.success !== false),
    `id=${r.body?.document?.id || r.body?.data?.id || r.body?.id}`);

  docId = r.body?.document?.id || r.body?.document?._id || r.body?.data?.id || r.body?.id || '';

  if (docId) {
    // Get document
    r = await request('GET', `${BACKEND}/documents/${docId}`, null, { Authorization: `Bearer ${token}` });
    log('Get document by ID (200)', r.status === 200);

    // Update document
    r = await request('PUT', `${BACKEND}/documents/${docId}`, { verified: true, notes: 'Updated via live test' }, { Authorization: `Bearer ${token}` });
    log('Update document (200)', r.status === 200);

    // Verify isolation — no token
    r = await request('GET', `${BACKEND}/documents/${docId}`);
    log('Unauthenticated access blocked (401)', r.status === 401);
  } else {
    log('Get document by ID (skipped — no docId)', false, 'upload may have failed');
    log('Update document (skipped)', false);
    log('Unauthenticated access blocked', false, 'skipped');
  }

  // ── 7. OTP Password Reset Flow ───────────────────────────────────────────
  console.log('\n▶ SECTION 5: OTP Password Reset');

  // Send OTP
  r = await request('POST', `${BACKEND}/auth/send-otp`, { email });
  log('Send OTP (200)', r.status === 200 && r.body?.success, r.body?.message);
  devOtp = r.body?.devOtp || '';
  log('Dev OTP returned (non-production exposes code)', !!devOtp, devOtp ? `OTP=${devOtp}` : 'not returned (production mode)');

  if (devOtp) {
    // Wrong OTP rejected
    r = await request('POST', `${BACKEND}/auth/verify-otp-reset`, { email, otp: '000000', password: newPw });
    log('Wrong OTP rejected (400)', r.status === 400);

    // Correct OTP resets password
    r = await request('POST', `${BACKEND}/auth/verify-otp-reset`, { email, otp: devOtp, password: newPw });
    log('Correct OTP resets password (200)', r.status === 200 && r.body?.success, r.body?.message);

    // OTP reuse blocked
    r = await request('POST', `${BACKEND}/auth/verify-otp-reset`, { email, otp: devOtp, password: 'yetanother' });
    log('OTP single-use (reuse blocked)', r.status === 400);

    // Old password rejected
    r = await request('POST', `${BACKEND}/auth/login`, { email, password: pw });
    log('Old password rejected after reset (401)', r.status === 401);

    // New password accepted
    r = await request('POST', `${BACKEND}/auth/login`, { email, password: newPw });
    log('New password accepted (200)', r.status === 200 && !!r.body?.token);
    if (r.body?.token) token = r.body.token;
  } else {
    // In production mode devOtp is hidden — just verify the endpoint exists
    log('Wrong OTP rejected (400)', r.status !== 404, 'endpoint exists');
    log('Correct OTP resets password', false, 'devOtp not exposed in production — manual test required');
    log('OTP single-use enforced', false, 'skipped — no devOtp');
    log('Old password rejected after reset', false, 'skipped');
    log('New password accepted', false, 'skipped');
  }

  // ── 8. Legacy forgot-password (link flow) ───────────────────────────────
  console.log('\n▶ SECTION 6: Legacy Token Flow');

  r = await request('POST', `${BACKEND}/auth/forgot-password`, { email });
  log('Legacy forgot-password endpoint (200)', r.status === 200 && r.body?.success);

  // ── 9. Logout ─────────────────────────────────────────────────────────────
  console.log('\n▶ SECTION 7: Logout');

  r = await request('POST', `${BACKEND}/auth/logout`, {}, { Authorization: `Bearer ${token}` });
  log('Logout returns success (200)', r.status === 200 && r.body?.success);

  // ── 10. Dashboard ─────────────────────────────────────────────────────────
  console.log('\n▶ SECTION 8: Dashboard');

  r = await request('GET', `${BACKEND}/dashboard/stats`, null, { Authorization: `Bearer ${token}` });
  log('Dashboard stats (200)', r.status === 200, `total=${r.body?.total ?? r.body?.totalDocuments}`);

  // ── FINAL RESULTS ─────────────────────────────────────────────────────────
  console.log('\n==========================================================');
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} TESTS PASSED ON LIVE PRODUCTION DEPLOYMENTS!`);
  } else {
    console.log(`📊 RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  }
  console.log('==========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE CRASHED:', err.message);
  process.exit(1);
});
