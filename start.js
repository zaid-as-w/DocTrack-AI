/**
 * DocTrack AI — Universal Stack Launcher
 * Runs both Backend API and Frontend Vite Client concurrently in any terminal.
 * Cross-platform compatible (Windows, macOS, Linux).
 */

const { spawn, exec } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const rootDir = __dirname;
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');

const target = (process.argv[2] || 'all').toLowerCase();

console.log('==================================================================');
console.log('  🚀 DocTrack AI — Full Stack Application Launcher');
console.log('==================================================================');
console.log(`  📂 Root Path:    ${rootDir}`);
console.log(`  📡 Backend API:  http://localhost:5000`);
console.log(`  🌐 Web App:      http://localhost:5173`);
console.log('==================================================================\n');

const children = [];

function killProcess(child) {
  if (!child || child.killed) return;
  if (isWin && child.pid) {
    try {
      exec(`taskkill /pid ${child.pid} /T /F`, () => {});
    } catch {
      child.kill('SIGTERM');
    }
  } else {
    child.kill('SIGTERM');
  }
}

function handleShutdown() {
  console.log('\n🛑 Stopping DocTrack AI servers...');
  children.forEach(killProcess);
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
process.on('exit', () => children.forEach(killProcess));

// 1. Launch Backend Server
if (target === 'all' || target === 'server' || target === 'backend') {
  console.log('📦 Starting Backend API Server (port 5000)...');
  const serverProcess = spawn('node', ['server.js'], {
    cwd: serverDir,
    stdio: 'pipe',
    shell: false,
    env: { ...process.env, PORT: process.env.PORT || '5000' }
  });

  children.push(serverProcess);

  serverProcess.stdout.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    lines.forEach((line) => {
      console.log(`\x1b[32m[SERVER]\x1b[0m ${line}`);
    });
  });

  serverProcess.stderr.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    lines.forEach((line) => {
      console.error(`\x1b[31m[SERVER ERROR]\x1b[0m ${line}`);
    });
  });

  serverProcess.on('error', (err) => {
    console.error(`\x1b[31m[SERVER ERROR]\x1b[0m Failed to start backend: ${err.message}`);
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`\x1b[31m[SERVER]\x1b[0m Process exited with code ${code}`);
    }
  });
}

// 2. Launch Frontend Client
if (target === 'all' || target === 'client' || target === 'frontend') {
  console.log('🌐 Starting Frontend Vite Server (port 5173)...');
  const clientProcess = isWin
    ? spawn('cmd.exe', ['/d', '/s', '/c', 'npm run dev'], { cwd: clientDir, stdio: 'pipe' })
    : spawn('npm', ['run', 'dev'], { cwd: clientDir, stdio: 'pipe' });

  children.push(clientProcess);

  clientProcess.stdout.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    lines.forEach((line) => {
      console.log(`\x1b[36m[CLIENT]\x1b[0m ${line}`);
    });
  });

  clientProcess.stderr.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    lines.forEach((line) => {
      console.error(`\x1b[33m[CLIENT NOTICE]\x1b[0m ${line}`);
    });
  });

  clientProcess.on('error', (err) => {
    console.error(`\x1b[31m[CLIENT ERROR]\x1b[0m Failed to start client: ${err.message}`);
  });

  clientProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`\x1b[33m[CLIENT]\x1b[0m Process exited with code ${code}`);
    }
  });
}
