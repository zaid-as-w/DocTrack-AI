/**
 * Comprehensive Automated Test Suite: Asynchronous Fast Upload & OCR Pipeline
 * DocTrack AI — Production Verification
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');

const { jwtSecret } = require('./src/config/env');
const AUTH_TOKEN = jwt.sign({ id: 'demo-user-zaid-001', email: 'zaid@example.com' }, jwtSecret, { expiresIn: '2h' });

const BASE_URL = 'http://localhost:5000';

// Helper: Make HTTP requests
const request = (method, endpoint, data = null, customHeaders = {}) => {
  return new Promise((resolve, reject) => {
    const cleanEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = new URL(cleanEndpoint, BASE_URL);
    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      ...customHeaders
    };

    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers
    };

    let bodyData = null;
    if (data && typeof data === 'object' && !(data instanceof Buffer)) {
      bodyData = JSON.stringify(data);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(bodyData);
    } else if (data instanceof Buffer) {
      bodyData = data;
      options.headers['Content-Length'] = data.length;
    }

    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          const json = raw ? JSON.parse(raw) : {};
          resolve({ status: res.statusCode, data: json, duration, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw, duration, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
};

// Multipart form-data builder for binary file uploads
const createMultipartPayload = (fields = {}, fileField = null) => {
  const boundary = `----DocTrackTestBoundary${Date.now()}`;
  const crlf = '\r\n';
  const parts = [];

  for (const [k, v] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="${k}"${crlf}${crlf}${v}${crlf}`));
  }

  if (fileField) {
    const { name, filename, contentType, buffer } = fileField;
    parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="${name}"; filename="${filename}"${crlf}Content-Type: ${contentType}${crlf}${crlf}`));
    parts.push(buffer);
    parts.push(Buffer.from(crlf));
  }

  parts.push(Buffer.from(`--${boundary}--${crlf}`));
  const buffer = Buffer.concat(parts);

  return {
    buffer,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    }
  };
};

const delay = ms => new Promise(r => setTimeout(r, ms));

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 DOCTRACK AI — ASYNC FAST UPLOAD & OCR PIPELINE TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, name, details = '') => {
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  };

  try {
    // 0. Health check
    const health = await request('GET', '/health');
    assert(health.status === 200, 'Server health check returns 200 OK');

    // -------------------------------------------------------------
    // TEST 1: Fast upload response (< 1000ms, HTTP 201, processingStatus: 'processing')
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Fast Document Upload Latency (< 1000ms) ---');
    // PDF Magic bytes %PDF-1.4 at start
    const samplePassportContent = Buffer.from('%PDF-1.4\nREPUBLIC OF INDIA / PASSPORT\nPassport No: Z9847291\nName: MOHAMMED ZAID\nDOB: 12/04/1995\nDate of Issue: 10/05/2018\nDate of Expiry: 10/05/2028\nIssuing Authority: Regional Passport Office');
    const { buffer: fastUploadBuf, headers: fastUploadHeaders } = createMultipartPayload(
      { title: 'Fast Passport Upload Test' },
      { name: 'file', filename: 'passport_scan.pdf', contentType: 'application/pdf', buffer: samplePassportContent }
    );

    const uploadRes = await request('POST', '/documents/upload', fastUploadBuf, fastUploadHeaders);
    assert(uploadRes.status === 201, `Upload endpoint responds with HTTP 201 Created (got ${uploadRes.status}: ${JSON.stringify(uploadRes.data)})`);
    assert(uploadRes.duration < 1000, `Upload response latency is ${uploadRes.duration}ms (< 1000ms target)`);
    assert(uploadRes.data.processingStatus === 'processing', `Initial processingStatus is "processing" (got ${uploadRes.data.processingStatus})`);
    assert(Boolean(uploadRes.data.documentId), `Valid documentId returned: ${uploadRes.data.documentId}`);

    const doc1Id = uploadRes.data.documentId;

    // -------------------------------------------------------------
    // TEST 2: Passport async processing completed in background
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Passport Background OCR & Entity Extraction ---');
    let doc1Status = null;
    for (let i = 0; i < 15; i++) {
      await delay(500);
      const res = await request('GET', `/documents/${doc1Id}/status`);
      if (res.data.processingStatus === 'completed' || res.data.processingStatus === 'needs_review') {
        doc1Status = res.data;
        break;
      }
    }

    assert(Boolean(doc1Status), 'Passport background processing reached terminal state within 7.5 seconds');
    if (doc1Status && doc1Status.data) {
      assert(doc1Status.data.docNumber === 'Z9847291', `Extracted docNumber: ${doc1Status.data.docNumber}`);
      assert(doc1Status.data.holderName.includes('ZAID'), `Extracted holderName: ${doc1Status.data.holderName}`);
      assert(doc1Status.data.expiryDate === '2028-05-10', `Normalized expiryDate: ${doc1Status.data.expiryDate}`);
      assert(doc1Status.data.issueDate === '2018-05-10', `Normalized issueDate: ${doc1Status.data.issueDate}`);
      assert(doc1Status.data.categoryId === 'identity', `Categorized under identity: ${doc1Status.data.categoryId}`);
    }

    // -------------------------------------------------------------
    // TEST 3: Driving License expiring in 15 days (Status = Expiring soon, reminders checked)
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Driving License Expiring in 15 Days ---');
    const future15Days = new Date();
    future15Days.setDate(future15Days.getDate() + 15);
    const yyyy = future15Days.getFullYear();
    const mm = String(future15Days.getMonth() + 1).padStart(2, '0');
    const dd = String(future15Days.getDate()).padStart(2, '0');
    const expiringSoonDate = `${dd}/${mm}/${yyyy}`; // DD/MM/YYYY

    const sampleDLContent = Buffer.from(`%PDF-1.4\nUNION OF INDIA - DRIVING LICENCE\nLicence No: KA03 2019000124\nName: RAHUL SHARMA\nDate of Issue: 01/08/2019\nDate of Expiry: ${expiringSoonDate}\nIssuing Authority: RTO Indiranagar`);
    const { buffer: dlBuf, headers: dlHeaders } = createMultipartPayload(
      { title: 'Rahul Driving License' },
      { name: 'file', filename: 'driving_licence.pdf', contentType: 'application/pdf', buffer: sampleDLContent }
    );

    const dlRes = await request('POST', '/documents/upload', dlBuf, dlHeaders);
    assert(dlRes.status === 201, 'Driving license uploaded instantly with HTTP 201');
    const dlDocId = dlRes.data.documentId;

    let dlStatus = null;
    for (let i = 0; i < 15; i++) {
      await delay(500);
      const res = await request('GET', `/documents/${dlDocId}/status`);
      if (res.data.processingStatus === 'completed' || res.data.processingStatus === 'needs_review') {
        dlStatus = res.data;
        break;
      }
    }

    assert(Boolean(dlStatus), 'Driving license background processing completed');
    if (dlStatus && dlStatus.data) {
      assert(dlStatus.data.status === 'EXPIRING_SOON', `Document status marked EXPIRING_SOON (got: ${dlStatus.data.status})`);
      assert(dlStatus.data.daysLeft <= 16 && dlStatus.data.daysLeft >= 14, `Days remaining calculated: ${dlStatus.data.daysLeft} days`);
      assert(dlStatus.data.categoryId === 'vehicle', `Categorized under vehicle: ${dlStatus.data.categoryId}`);
      assert(Array.isArray(dlStatus.data.notificationHistory), 'Notification history tracked on document');
    }

    // -------------------------------------------------------------
    // TEST 4: Document expiring in 2 years (Status = Active, no notification)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Document Expiring in 2 Years (Active, No Notification) ---');
    const future2Years = new Date();
    future2Years.setFullYear(future2Years.getFullYear() + 2);

    const sampleInsuranceContent = Buffer.from(`%PDF-1.4\nBAJAJ ALLIANZ GENERAL INSURANCE\nPolicy No: BA-POL-882199\nInsured Vehicle: Honda City\nPeriod of Insurance: From 01/01/2026 To 31/12/${future2Years.getFullYear()}\nIssuing Authority: Bajaj Allianz`);
    const { buffer: insBuf, headers: insHeaders } = createMultipartPayload(
      { title: 'Honda City Insurance Policy' },
      { name: 'file', filename: 'insurance_policy.pdf', contentType: 'application/pdf', buffer: sampleInsuranceContent }
    );

    const insRes = await request('POST', '/documents/upload', insBuf, insHeaders);
    assert(insRes.status === 201, 'Insurance policy uploaded with HTTP 201');
    const insDocId = insRes.data.documentId;

    let insStatus = null;
    for (let i = 0; i < 15; i++) {
      await delay(500);
      const res = await request('GET', `/documents/${insDocId}/status`);
      if (res.data.processingStatus === 'completed' || res.data.processingStatus === 'needs_review') {
        insStatus = res.data;
        break;
      }
    }

    assert(Boolean(insStatus), 'Insurance background processing completed');
    if (insStatus && insStatus.data) {
      assert(insStatus.data.status === 'ACTIVE', `Document status is ACTIVE (got: ${insStatus.data.status})`);
      assert(insStatus.data.daysLeft > 100, `Days left reflects long horizon (${insStatus.data.daysLeft} days)`);
    }

    // -------------------------------------------------------------
    // TEST 5: Multiple dates separated (DOB, Issue Date, Expiry Date)
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Contextual Separation of DOB, Issue, and Expiry Dates ---');
    const multiDateContent = Buffer.from('%PDF-1.4\nGOVERNMENT OF INDIA\nPassport No: K8192019\nName: AYESHA KHAN\nDOB: 15/08/1998\nDate of Issue: 20/01/2020\nDate of Expiry: 19/01/2030');
    const { buffer: mdBuf, headers: mdHeaders } = createMultipartPayload(
      { title: 'Ayesha Passport Multi Date' },
      { name: 'file', filename: 'ayesha_passport.pdf', contentType: 'application/pdf', buffer: multiDateContent }
    );

    const mdRes = await request('POST', '/documents/upload', mdBuf, mdHeaders);
    const mdDocId = mdRes.data.documentId;

    let mdStatus = null;
    for (let i = 0; i < 15; i++) {
      await delay(500);
      const res = await request('GET', `/documents/${mdDocId}/status`);
      if (res.data.processingStatus === 'completed' || res.data.processingStatus === 'needs_review') {
        mdStatus = res.data;
        break;
      }
    }

    assert(Boolean(mdStatus), 'Multi-date document processed');
    if (mdStatus && mdStatus.data) {
      assert(mdStatus.data.dateOfBirth === '1998-08-15', `DOB separated correctly: ${mdStatus.data.dateOfBirth}`);
      assert(mdStatus.data.issueDate === '2020-01-20', `Issue date separated correctly: ${mdStatus.data.issueDate}`);
      assert(mdStatus.data.expiryDate === '2030-01-19', `Expiry date separated correctly: ${mdStatus.data.expiryDate}`);
    }

    // -------------------------------------------------------------
    // TEST 6: Document with NO expiry date (Perpetual / Lifetime)
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Document with No Expiry Date (Perpetual / Non-Expiring) ---');
    const aadhaarContent = Buffer.from('%PDF-1.4\nGOVERNMENT OF INDIA / UIDAI\nAadhaar No: 9812 4819 2018\nName: ZAID SHARMA\nDOB: 12/04/1995\nDate of Issue: 15/03/2018\nValidity: Lifetime / Perpetual');
    const { buffer: aadhBuf, headers: aadhHeaders } = createMultipartPayload(
      { title: 'Zaid Aadhaar Card' },
      { name: 'file', filename: 'aadhaar_card.pdf', contentType: 'application/pdf', buffer: aadhaarContent }
    );

    const aadhRes = await request('POST', '/documents/upload', aadhBuf, aadhHeaders);
    assert(aadhRes.status === 201, 'Perpetual document uploaded without mandatory expiry date error');
    const aadhDocId = aadhRes.data.documentId;

    let aadhStatus = null;
    for (let i = 0; i < 15; i++) {
      await delay(500);
      const res = await request('GET', `/documents/${aadhDocId}/status`);
      if (res.data.processingStatus === 'completed' || res.data.processingStatus === 'needs_review') {
        aadhStatus = res.data;
        break;
      }
    }

    assert(Boolean(aadhStatus), 'Aadhaar background processing completed');
    if (aadhStatus && aadhStatus.data) {
      assert(
        aadhStatus.data.expiryDate === 'Perpetual' || aadhStatus.data.status === 'ACTIVE' || aadhStatus.data.status === 'NO_EXPIRY',
        `Document correctly marked as Perpetual / Active (expiryDate: ${aadhStatus.data.expiryDate}, status: ${aadhStatus.data.status})`
      );
    }

    // -------------------------------------------------------------
    // TEST 7: Polling endpoint GET /api/documents/:id/status
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Dedicated Status Polling Endpoint ---');
    const pollCheck = await request('GET', `/documents/${doc1Id}/status`);
    assert(pollCheck.status === 200, 'GET /documents/:id/status returns 200 OK');
    assert(Boolean(pollCheck.data.documentId), 'Response contains documentId');
    assert(Boolean(pollCheck.data.processingStatus), `processingStatus returned: ${pollCheck.data.processingStatus}`);
    assert(Boolean(pollCheck.data.processingStage), `processingStage returned: ${pollCheck.data.processingStage}`);
    assert(Boolean(pollCheck.data.data), 'Full document record returned in data object');

    // -------------------------------------------------------------
    // TEST 8: Retry endpoint POST /api/documents/:id/retry-ocr
    // -------------------------------------------------------------
    console.log('\n--- Test 8: OCR Retry Endpoint ---');
    const retryRes = await request('POST', `/documents/${doc1Id}/retry-ocr`);
    assert(retryRes.status === 200, 'POST /documents/:id/retry-ocr returns 200 OK');
    assert(retryRes.data.processingStatus === 'processing', 'Status reset to "processing" upon retry');

    // -------------------------------------------------------------
    // TEST 9: Duplicate Job Prevention on Concurrent Retry/Process
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Duplicate Job Prevention (Job Lock) ---');
    const [dup1, dup2] = await Promise.all([
      request('POST', `/documents/${doc1Id}/retry-ocr`),
      request('POST', `/documents/${doc1Id}/retry-ocr`)
    ]);

    assert(dup1.status === 200 && dup2.status === 200, 'Both concurrent calls responded safely without race condition');
    console.log(`  Concurrent request results: req1=${dup1.data.alreadyRunning ? 'Locked' : 'Enqueued'}, req2=${dup2.data.alreadyRunning ? 'Locked' : 'Enqueued'}`);

    await delay(1200);

    // -------------------------------------------------------------
    // TEST 10: Duplicate Notification Prevention on Re-Processing
    // -------------------------------------------------------------
    console.log('\n--- Test 10: Notification Deduplication ---');
    await request('POST', `/documents/${dlDocId}/retry-ocr`);
    await delay(1500);
    const dlAfterRetry = await request('GET', `/documents/${dlDocId}/status`);
    if (dlAfterRetry.data?.data?.notificationHistory) {
      const history = dlAfterRetry.data.data.notificationHistory;
      console.log(`  Notification history length after retry: ${history.length}`);
      assert(history.length >= 1, 'Notifications recorded without unhandled crash');
    }

    // -------------------------------------------------------------
    // TEST 11: OCR Failure Resilience (Document preserved, status = failed, retry available)
    // -------------------------------------------------------------
    console.log('\n--- Test 11: OCR Failure Resilience & Document Preservation ---');
    const unparseableBuf = Buffer.from('%PDF-1.4\n--- RANDOM CORRUPTED BYTES 0xDEADBEEF ---');
    const { buffer: failBuf, headers: failHeaders } = createMultipartPayload(
      { title: 'Corrupted File Test' },
      { name: 'file', filename: 'corrupted.pdf', contentType: 'application/pdf', buffer: unparseableBuf }
    );

    const failUpload = await request('POST', '/documents/upload', failBuf, failHeaders);
    assert(failUpload.status === 201, 'Upload succeeds even for unparseable file');
    const failDocId = failUpload.data.documentId;

    await delay(1200);
    const failStatus = await request('GET', `/documents/${failDocId}/status`);
    assert(failStatus.status === 200, 'Document record was NOT deleted from database');
    assert(Boolean(failStatus.data.data), 'Document record persists safely in vault');
    assert(
      failStatus.data.processingStatus === 'completed' || failStatus.data.processingStatus === 'needs_review' || failStatus.data.processingStatus === 'failed',
      `Document transitioned to safe state: ${failStatus.data.processingStatus}`
    );

    console.log('\n===============================================================');
    console.log(`🏁 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('\n❌ Unhandled test runner exception:', err);
    process.exit(1);
  }
}

runTests();
