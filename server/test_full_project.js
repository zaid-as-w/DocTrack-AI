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

async function verifyFullProject() {
  console.log('==================================================');
  console.log('🚀 DOCTRACK AI — END-TO-END PROJECT VERIFICATION');
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

  // 1. Health Check
  console.log('--- 1. HEALTH & CONNECTIVITY ---');
  const health = await request({ hostname: 'localhost', port: 5000, path: '/api/health', method: 'GET' });
  assert(health.status === 200, `Health check is 200 (got ${health.status})`);
  assert(health.body.status === 'ok', `Health reports ok status (got ${health.body.status})`);

  // 2. Auth: Register without phone (Data Minimization)
  console.log('\n--- 2. AUTHENTICATION & DATA MINIMIZATION ---');
  const noPhoneEmail = `nophone_${Date.now()}@doctrack.ai`;
  const regNoPhone = await request(
    { hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { name: 'Privacy User', email: noPhoneEmail, password: 'password123' }
  );
  assert(regNoPhone.status === 201, `Registration without phone succeeded (201, got ${regNoPhone.status})`);
  assert(regNoPhone.body.token, 'Token returned for phone-free registration');
  assert(regNoPhone.body.user.phone === '', 'User phone is empty string as expected');

  const tokenNoPhone = regNoPhone.body.token;
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenNoPhone}` };

  // 3. Profiles: Provisioning & CRUD
  console.log('\n--- 3. PROFILES MANAGEMENT ---');
  const profilesRes = await request({ hostname: 'localhost', port: 5000, path: '/api/profiles', method: 'GET', headers: authHeaders });
  assert(profilesRes.status === 200, 'GET /api/profiles returns 200');
  const profiles = profilesRes.body.data || profilesRes.body.profiles || [];
  assert(profiles.length >= 1, `User has at least 1 provisioned profile (got ${profiles.length})`);
  const selfProfile = profiles[0];

  const createProfileRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/profiles', method: 'POST', headers: authHeaders },
    { name: 'BMW 330i', type: 'vehicle', relation: 'My Sedan', color: '#3B82F6' }
  );
  assert(createProfileRes.status === 201, `Created new vehicle profile (got ${createProfileRes.status})`);
  const vehicleProfile = createProfileRes.body.data || createProfileRes.body.profile;

  // 4. Documents: Creation, Expiry Calculation & Isolation
  console.log('\n--- 4. DOCUMENTS & EXPIRY ENGINE ---');
  const createDocRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/documents', method: 'POST', headers: authHeaders },
    {
      title: 'Vehicle Comprehensive Insurance',
      category: 'VEHICLE',
      documentType: 'insurance',
      issueDate: '2025-01-01',
      expiryDate: '2026-01-01',
      profileId: vehicleProfile.id || vehicleProfile._id,
      documentNumber: 'POL-9921448',
      issuer: 'HDFC ERGO'
    }
  );
  assert(createDocRes.status === 201, `Created document under vehicle profile (got ${createDocRes.status})`);
  const createdDoc = createDocRes.body.data || createDocRes.body.document;
  assert(createdDoc.status === 'ACTIVE' || createdDoc.status === 'EXPIRING_SOON' || createdDoc.status === 'EXPIRED', `Document has valid status: ${createdDoc.status}`);

  // Fetch document by ID
  const getDocRes = await request(
    { hostname: 'localhost', port: 5000, path: `/api/documents/${createdDoc.id || createdDoc._id}`, method: 'GET', headers: authHeaders }
  );
  assert(getDocRes.status === 200, 'GET single document by ID returns 200');

  // Filter documents by profile
  const vehicleDocs = await request(
    { hostname: 'localhost', port: 5000, path: `/api/documents?profileId=${vehicleProfile.id || vehicleProfile._id}`, method: 'GET', headers: authHeaders }
  );
  assert(vehicleDocs.status === 200 && (vehicleDocs.body.data || vehicleDocs.body.documents).length === 1, 'Vehicle profile has exactly 1 document');

  const selfDocs = await request(
    { hostname: 'localhost', port: 5000, path: `/api/documents?profileId=${selfProfile.id || selfProfile._id}`, method: 'GET', headers: authHeaders }
  );
  assert(selfDocs.status === 200 && (selfDocs.body.data || selfDocs.body.documents).length === 0, 'Self profile has 0 documents (strict profile isolation)');

  // 5. Warranties Management
  console.log('\n--- 5. WARRANTIES & GUARANTEE LIFECYCLE ---');
  const createWarrantyRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/warranties', method: 'POST', headers: authHeaders },
    {
      productName: 'MacBook Pro M3 Max',
      brand: 'Apple',
      category: 'ELECTRONICS',
      purchaseDate: '2024-06-01',
      durationMonths: 36,
      provider: 'AppleCare+ Global',
      profileId: selfProfile.id || selfProfile._id
    }
  );
  assert(createWarrantyRes.status === 201, `Created warranty record (got ${createWarrantyRes.status})`);

  const listWarrantiesRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/warranties', method: 'GET', headers: authHeaders }
  );
  assert(listWarrantiesRes.status === 200, 'GET /api/warranties returns 200');
  const warranties = listWarrantiesRes.body.data || listWarrantiesRes.body.warranties || [];
  assert(warranties.length >= 1, `Warranty list returned ${warranties.length} items`);

  // 6. Renewal Assistant & Statutory Guidance
  console.log('\n--- 6. RENEWAL ASSISTANT & ADVISORY ENGINE ---');
  const renewalsRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/renewals', method: 'GET', headers: authHeaders }
  );
  assert(renewalsRes.status === 200, 'GET /api/renewals returns 200');

  // 7. AI Chatbot Assistant
  console.log('\n--- 7. AI ASSISTANT CHATBOT ENGINE ---');
  const chatRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/chat/message', method: 'POST', headers: authHeaders },
    { message: 'What documents do I have expiring soon?' }
  );
  assert(chatRes.status === 200, `Chatbot returned 200 (got ${chatRes.status})`);
  const botReply = chatRes.body.data?.reply || chatRes.body.reply;
  assert(typeof botReply === 'string' && botReply.length > 0, 'Chatbot provided intelligent response');

  // 8. OCR Templates & Classification
  console.log('\n--- 8. OCR ENGINE & CLASSIFICATION ---');
  const ocrTemplates = await request(
    { hostname: 'localhost', port: 5000, path: '/api/ocr/templates', method: 'GET', headers: authHeaders }
  );
  assert(ocrTemplates.status === 200, 'GET /api/ocr/templates returns 200');

  // 9. Dashboard Aggregations
  console.log('\n--- 9. DASHBOARD ANALYTICS & KPIS ---');
  const dashStats = await request(
    { hostname: 'localhost', port: 5000, path: '/api/dashboard/stats', method: 'GET', headers: authHeaders }
  );
  assert(dashStats.status === 200, 'GET /api/dashboard/stats returns 200');
  const totalMetrics = dashStats.body.data?.metrics?.total ?? dashStats.body.metrics?.total;
  assert(typeof totalMetrics === 'number', `Dashboard stats include total document metrics (got ${totalMetrics})`);

  // 10. Frontend Client Availability
  console.log('\n--- 10. FRONTEND CLIENT ACCESSIBILITY ---');
  const feIndex = await request({ hostname: 'localhost', port: 5173, path: '/', method: 'GET' });
  assert(feIndex.status === 200, `Frontend root index serves HTTP 200 (got ${feIndex.status})`);

  console.log('\n==================================================');
  console.log(`🏁 FULL PROJECT VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

verifyFullProject().catch((err) => {
  console.error('Fatal error during project verification:', err);
  process.exit(1);
});
