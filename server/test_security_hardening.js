/**
 * Comprehensive Security, Validation & IDOR Hardening Test Suite
 * DocTrack AI — Iteration 13
 */

const http = require('http');
const app = require('./src/app');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_doctrack_local_key_change_in_production';

function makeRequest(server, options, body = null, isMultipart = false) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (body && !isMultipart && typeof body === 'object') {
      body = JSON.stringify(body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function makeMultipartUpload(server, token, fieldName, filename, fileBuffer, textFields = {}) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    let payload = Buffer.alloc(0);

    for (const [key, val] of Object.entries(textFields)) {
      const fieldHeader = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
      );
      payload = Buffer.concat([payload, fieldHeader]);
    }

    if (filename !== null) {
      let mimeType = 'application/octet-stream';
      if (filename.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (filename.endsWith('.png')) mimeType = 'image/png';
      else if (filename.endsWith('.exe')) mimeType = 'application/x-msdownload';

      const fileHeader = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      );
      const fileFooter = Buffer.from('\r\n');
      payload = Buffer.concat([payload, fileHeader, fileBuffer, fileFooter]);
    }

    const endBoundary = Buffer.from(`--${boundary}--\r\n`);
    payload = Buffer.concat([payload, endBoundary]);

    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: '/api/documents',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  const server = http.createServer(app);
  await new Promise(res => server.listen(0, res));

  console.log(`\n==================================================`);
  console.log(`DOCTRACK AI — ITERATION 13 SECURITY HARNESS`);
  console.log(`Running against ephemeral test server on port ${server.address().port}`);
  console.log(`==================================================\n`);

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${details ? '— ' + details : ''}`);
      failed++;
    }
  }

  try {
    // 1. Unauthenticated checks
    console.log('--- 1. Authentication & Route Protection ---');
    const protectedRoutes = [
      '/api/documents',
      '/api/profiles',
      '/api/warranties',
      '/api/notifications',
      '/api/dashboard/stats',
      '/api/reminders/horizon',
      '/api/expiry/summary',
      '/api/alerts',
      '/api/chat/history',
      '/api/renewals'
    ];

    for (const route of protectedRoutes) {
      const res = await makeRequest(server, { path: route });
      assert(
        `Unauthenticated ${route} returns 401 UNAUTHENTICATED`,
        res.status === 401 && (res.body?.code === 'UNAUTHENTICATED' || res.body?.errorCode === 'UNAUTHENTICATED'),
        `status: ${res.status}, body: ${JSON.stringify(res.body)}`
      );
    }

    // 2. Input Validation
    console.log('\n--- 2. Input & Format Validation ---');
    const invalidEmailRes = await makeRequest(server, {
      path: '/api/auth/register',
      method: 'POST'
    }, { name: 'Test', email: 'not-an-email', password: 'password123' });
    assert(
      'Register rejects invalid email with 400 VALIDATION_ERROR',
      invalidEmailRes.status === 400 && invalidEmailRes.body?.code === 'VALIDATION_ERROR',
      `status: ${invalidEmailRes.status}`
    );

    const shortPassRes = await makeRequest(server, {
      path: '/api/auth/register',
      method: 'POST'
    }, { name: 'Test', email: 'test@example.com', password: '123' });
    assert(
      'Register rejects short password (<6 chars) with 400 VALIDATION_ERROR',
      shortPassRes.status === 400 && shortPassRes.body?.code === 'VALIDATION_ERROR',
      `status: ${shortPassRes.status}`
    );

    // Create tokens for User A and User B
    const userAToken = jwt.sign({ id: 'user-alice-001', email: 'alice@example.com', name: 'Alice' }, JWT_SECRET, { expiresIn: '1h' });
    const userBToken = jwt.sign({ id: 'user-bob-002', email: 'bob@example.com', name: 'Bob' }, JWT_SECRET, { expiresIn: '1h' });

    // Date validation: issueDate > expiryDate
    const invalidDateRes = await makeRequest(server, {
      path: '/api/documents',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userAToken}` }
    }, {
      title: 'Invalid Date Document',
      category: 'Identity Proofs',
      issueDate: '2026-12-01',
      expiryDate: '2026-01-01'
    });
    assert(
      'Document creation rejects issueDate > expiryDate with 400 VALIDATION_ERROR',
      invalidDateRes.status === 400 && invalidDateRes.body?.code === 'VALIDATION_ERROR',
      `status: ${invalidDateRes.status}, msg: ${invalidDateRes.body?.message}`
    );

    // Param format safety (malformed ID)
    const malformedIdRes = await makeRequest(server, {
      path: '/api/documents/invalid:id$with!bad@chars',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    assert(
      'Malformed ID param rejected with 400 INVALID_ID / INVALID_RESOURCE_ID',
      malformedIdRes.status === 400 && (malformedIdRes.body?.code === 'INVALID_ID' || malformedIdRes.body?.code === 'INVALID_RESOURCE_ID'),
      `status: ${malformedIdRes.status}, code: ${malformedIdRes.body?.code}`
    );

    // 3. User Data Isolation & IDOR Protection
    console.log('\n--- 3. Authorization & IDOR Protection ---');

    // User A creates a document
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const docUploadRes = await makeMultipartUpload(
      server,
      userAToken,
      'file',
      'alice_passport.pdf',
      validPdfBuffer,
      { title: "Alice's Private Passport", category: 'Identity Proofs', issueDate: '2020-01-01', expiryDate: '2030-01-01' }
    );

    assert(
      'User A can create a private document',
      docUploadRes.status === 201 && docUploadRes.body?.success === true,
      `status: ${docUploadRes.status}`
    );

    const aliceDocId = docUploadRes.body?.data?.id;

    if (aliceDocId) {
      // User B attempts to access Alice's document
      const idorDocRes = await makeRequest(server, {
        path: `/api/documents/${aliceDocId}`,
        headers: { 'Authorization': `Bearer ${userBToken}` }
      });
      assert(
        `User B receives 403 Forbidden or 404 Not Found accessing User A's document (IDOR prevented)`,
        idorDocRes.status === 403 || idorDocRes.status === 404,
        `status: ${idorDocRes.status}, body: ${JSON.stringify(idorDocRes.body)}`
      );

      // User B attempts to delete Alice's document
      const idorDeleteRes = await makeRequest(server, {
        path: `/api/documents/${aliceDocId}`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${userBToken}` }
      });
      assert(
        `User B cannot delete User A's document (returns 403 or 404)`,
        idorDeleteRes.status === 403 || idorDeleteRes.status === 404,
        `status: ${idorDeleteRes.status}`
      );
    }

    // User B querying document list only gets User B's documents
    const userBDocsRes = await makeRequest(server, {
      path: '/api/documents',
      headers: { 'Authorization': `Bearer ${userBToken}` }
    });
    const userBDocs = userBDocsRes.body?.data || [];
    const hasAliceDoc = userBDocs.some(d => d.id === aliceDocId || d.userId === 'user-alice-001');
    assert(
      'User B documents list does not contain User A documents',
      !hasAliceDoc,
      `docs count: ${userBDocs.length}`
    );

    // Profile IDOR check
    const userBProfileRes = await makeRequest(server, {
      path: '/api/profiles',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userBToken}` }
    }, { name: "Bob's Secret Car", type: 'vehicle', relation: 'Personal' });

    const bobProfileId = userBProfileRes.body?.data?.id;
    if (bobProfileId) {
      const idorProfileDelete = await makeRequest(server, {
        path: `/api/profiles/${bobProfileId}`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${userAToken}` }
      });
      assert(
        `User A cannot delete User B's profile (returns 403 or 404)`,
        idorProfileDelete.status === 403 || idorProfileDelete.status === 404,
        `status: ${idorProfileDelete.status}`
      );
    }

    // 4. File Upload Hardening
    console.log('\n--- 4. File Upload Hardening ---');

    // Reject executable
    const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
    const exeUploadRes = await makeMultipartUpload(
      server,
      userAToken,
      'file',
      'malware.exe',
      exeBuffer,
      { title: 'Malware Exe', category: 'Other Documents' }
    );
    assert(
      'Upload rejects .exe extension with 400 INVALID_FILE_TYPE',
      exeUploadRes.status === 400 && exeUploadRes.body?.code === 'INVALID_FILE_TYPE',
      `status: ${exeUploadRes.status}`
    );

    // Reject empty 0-byte file
    const emptyBuffer = Buffer.alloc(0);
    const emptyUploadRes = await makeMultipartUpload(
      server,
      userAToken,
      'file',
      'empty.pdf',
      emptyBuffer,
      { title: 'Empty PDF', category: 'Other Documents' }
    );
    assert(
      'Upload rejects 0-byte empty file with 400 EMPTY_FILE',
      emptyUploadRes.status === 400 && emptyUploadRes.body?.code === 'EMPTY_FILE',
      `status: ${emptyUploadRes.status}`
    );

    // Reject spoofed magic bytes (exe content named .pdf)
    const spoofedBuffer = Buffer.from('MZThisIsAnExecutable disguised as pdf');
    const spoofedUploadRes = await makeMultipartUpload(
      server,
      userAToken,
      'file',
      'disguised.pdf',
      spoofedBuffer,
      { title: 'Spoofed PDF', category: 'Other Documents' }
    );
    assert(
      'Upload rejects spoofed magic byte executable (.pdf extension) with 400',
      spoofedUploadRes.status === 400 && (spoofedUploadRes.body?.code === 'INVALID_FILE_SIGNATURE' || spoofedUploadRes.body?.code === 'INVALID_FILE_TYPE'),
      `status: ${spoofedUploadRes.status}, body: ${JSON.stringify(spoofedUploadRes.body)}`
    );

    // 5. Standard Error Responses & Zero Leakage
    console.log('\n--- 5. Error Consistency & Information Leakage ---');
    const sample404Res = await makeRequest(server, {
      path: '/api/documents/000000000000000000000000',
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    assert(
      'Error response has success: false, status: error, code, errorCode, and message',
      sample404Res.body?.success === false &&
      sample404Res.body?.status === 'error' &&
      !!sample404Res.body?.code &&
      !!sample404Res.body?.errorCode &&
      !!sample404Res.body?.message,
      `body: ${JSON.stringify(sample404Res.body)}`
    );

    const bodyStr = JSON.stringify(sample404Res.body);
    assert(
      'Error response does not leak stack traces or internal filesystem paths',
      !bodyStr.includes('node_modules') && !bodyStr.includes('C:\\') && !bodyStr.includes('/Users/'),
      `body: ${bodyStr}`
    );

  } catch (err) {
    console.error('Test harness exception:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log(`\n==================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
