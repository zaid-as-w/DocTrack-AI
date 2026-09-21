/**
 * DocTrack AI — Production Deployment Readiness Verification Test Suite
 * Tests CORS with Vercel origins, health endpoints, directory initialization,
 * and deployment configuration integrity.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

let server;
const TEST_PORT = 59998;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function makeRequest({ method = 'GET', path: reqPath, headers = {} }) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch (_) {}
          resolve({ status: res.statusCode, headers: res.headers, body, json });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('==================================================');
  console.log('🚀 DOCTRACK AI — DEPLOYMENT READINESS TEST SUITE');
  console.log(`Testing backend on ephemeral port ${TEST_PORT}`);
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

  // Set environment for test
  process.env.NODE_ENV = 'production';
  process.env.CLIENT_URL = 'https://doctrack.example.com';
  const app = require('./src/app');

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', resolve);
  });

  try {
    // 1. Root and Health Endpoints
    console.log('--- 1. Root & Health Check Endpoints ---');
    const rootRes = await makeRequest({ path: '/' });
    assert(rootRes.status === 200, `GET / returns 200 OK (got ${rootRes.status})`);
    assert(rootRes.json?.status === 'ok', `GET / status is 'ok'`);

    const healthRes = await makeRequest({ path: '/health' });
    assert(healthRes.status === 200, `GET /health returns 200 OK (got ${healthRes.status})`);
    assert(healthRes.json?.status === 'ok', `GET /health status is 'ok'`);

    const apiHealthRes = await makeRequest({ path: '/api/health' });
    assert(apiHealthRes.status === 200, `GET /api/health returns 200 OK (got ${apiHealthRes.status})`);
    assert(apiHealthRes.json?.status === 'ok', `GET /api/health status is 'ok'`);

    // 2. CORS Verification for Vercel & Production
    console.log('\n--- 2. CORS & Origin Resolution ---');
    const vercelRes = await makeRequest({
      path: '/api/health',
      headers: { Origin: 'https://doc-track-ai.vercel.app' }
    });
    assert(
      vercelRes.headers['access-control-allow-origin'] === 'https://doc-track-ai.vercel.app',
      'Production allows https://doc-track-ai.vercel.app origin'
    );

    const vercelPreviewRes = await makeRequest({
      path: '/api/health',
      headers: { Origin: 'https://doctrack-ai-preview-abc123.vercel.app' }
    });
    assert(
      vercelPreviewRes.headers['access-control-allow-origin'] === 'https://doctrack-ai-preview-abc123.vercel.app',
      'Production allows dynamic Vercel preview branch origin'
    );

    const configuredRes = await makeRequest({
      path: '/api/health',
      headers: { Origin: 'https://doctrack.example.com' }
    });
    assert(
      configuredRes.headers['access-control-allow-origin'] === 'https://doctrack.example.com',
      'Allows configured CLIENT_URL origin'
    );

    // Preflight OPTIONS check
    const preflightRes = await makeRequest({
      method: 'OPTIONS',
      path: '/api/documents',
      headers: {
        Origin: 'https://doctrack-ai.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    assert(
      preflightRes.status === 204 || preflightRes.status === 200,
      `CORS preflight OPTIONS returns 200/204 (got ${preflightRes.status})`
    );
    assert(
      preflightRes.headers['access-control-allow-origin'] === 'https://doctrack-ai.vercel.app',
      'OPTIONS preflight sets Access-Control-Allow-Origin'
    );

    // 3. Storage & Directory Integrity
    console.log('\n--- 3. Storage & Ephemeral Directory Integrity ---');
    const uploadsDir = path.resolve(__dirname, 'uploads');
    assert(fs.existsSync(uploadsDir), 'Uploads directory exists and was auto-created');

    const dataDir = path.resolve(__dirname, 'data');
    assert(fs.existsSync(dataDir), 'Data directory exists');
    assert(fs.existsSync(path.join(dataDir, '.gitkeep')), 'Data directory contains .gitkeep');

    // 4. Client SPA Routing Configuration
    console.log('\n--- 4. Client Vercel Configuration ---');
    const clientVercelConfigPath = path.resolve(__dirname, '../client/vercel.json');
    assert(fs.existsSync(clientVercelConfigPath), 'client/vercel.json exists');

    const vercelConfig = JSON.parse(fs.readFileSync(clientVercelConfigPath, 'utf8'));
    const hasSpaRewrite = vercelConfig.rewrites?.some(
      (r) => r.source === '/(.*)' && r.destination === '/index.html'
    );
    assert(hasSpaRewrite, 'client/vercel.json contains SPA rewrite /(.*) -> /index.html');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n==================================================');
  console.log(`DEPLOYMENT READINESS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
