import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const APP_PORT = Number(process.env.PLAYWRIGHT_APP_PORT || 5173);
const API_PORT = Number(process.env.MOCK_API_PORT || 8011);
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const children = [];

const spawnNode = (args, env = {}) => {
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
    windowsHide: true,
  });

  children.push(child);
  return child;
};

const waitForUrl = async (url, label, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Retry until the server is ready or the timeout expires.
    }

    await delay(500);
  }

  throw new Error(`${label} did not become ready at ${url}`);
};

const killTree = (child) =>
  new Promise((resolve) => {
    if (!child?.pid || child.exitCode !== null || child.signalCode) {
      resolve();
      return;
    }

    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
      return;
    }

    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null && !child.signalCode) child.kill('SIGKILL');
      resolve();
    }, 1000);
  });

const cleanup = async () => {
  await Promise.allSettled([...children].reverse().map(killTree));
};

const run = async () => {
  spawnNode(['scripts/manual/mock-server.mjs'], {
    MOCK_API_PORT: String(API_PORT),
  });

  await waitForUrl(`${API_URL}/health`, 'Mock API', 30_000);

  spawnNode(['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(APP_PORT)], {
    VITE_API_URL: API_URL,
  });

  await waitForUrl(APP_URL, 'Vite app', 60_000);

  const playwrightArgs = ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)];
  const playwright = spawn(process.execPath, playwrightArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });

  return await new Promise((resolve) => {
    playwright.on('exit', (code) => resolve(code ?? 1));
    playwright.on('error', () => resolve(1));
  });
};

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await cleanup();
    process.exit(130);
  });
}

let exitCode = 1;

try {
  exitCode = await run();
} finally {
  await cleanup();
}

process.exit(exitCode);
