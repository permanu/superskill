import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { buildMcpEntry } from '../dist/setup/configure.js';

const run = promisify(execFile);
const root = await mkdtemp(join(tmpdir(), 'superskill-update-smoke-'));
const requests = [];
const packages = new Map();
let latest = '1.0.0';
let registry;
const server = createServer((request, response) => {
  const path = new URL(request.url, registry).pathname;
  requests.push({ path, latest });
  response.setHeader('cache-control', 'no-store');
  if (path === '/superskill') {
    const versions = Object.fromEntries([...packages].map(([version, entry]) => [version, {
      name: 'superskill', version, bin: { superskill: 'cli.cjs' },
      dist: { tarball: `${registry}superskill/-/${entry.filename}`, integrity: entry.integrity },
    }]));
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ name: 'superskill', 'dist-tags': { latest }, versions }));
    return;
  }
  const entry = [...packages.values()].find(item => path === `/superskill/-/${item.filename}`);
  if (entry) {
    response.setHeader('content-type', 'application/octet-stream');
    response.end(entry.bytes);
    return;
  }
  response.writeHead(404);
  response.end('Unexpected registry request');
});
try {
  const work = join(root, 'empty-workspace');
  await mkdir(work);
  const userConfig = join(root, 'user.npmrc');
  const globalConfig = join(root, 'global.npmrc');
  await writeFile(userConfig, '');
  await writeFile(globalConfig, '');
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  registry = `http://127.0.0.1:${server.address().port}/`;
  const env = {
    ...process.env,
    npm_config_cache: join(root, 'cache'),
    npm_config_registry: registry,
    npm_config_userconfig: userConfig,
    npm_config_globalconfig: globalConfig,
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_update_notifier: 'false',
    npm_config_ignore_scripts: 'true',
    npm_config_fetch_retries: '0',
    npm_config_fetch_timeout: '10000',
  };
  for (const version of ['1.0.0', '1.0.1']) {
    const fixture = join(root, `package-${version}`);
    await mkdir(fixture);
    await writeFile(join(fixture, 'package.json'), JSON.stringify({ name: 'superskill', version, bin: { superskill: 'cli.cjs' }, files: ['cli.cjs'] }));
    await writeFile(join(fixture, 'cli.cjs'), `#!/usr/bin/env node\nconsole.log('superskill-update-smoke:${version}');\n`, { mode: 0o755 });
    const packed = await run('npm', ['pack', '--json', '--ignore-scripts'], { cwd: fixture, env, timeout: 30000 });
    const [{ filename }] = JSON.parse(packed.stdout);
    const bytes = await readFile(join(fixture, filename));
    packages.set(version, { filename, bytes, integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}` });
  }
  const entry = buildMcpEntry('string', 'env', join(root, 'vault'));
  assert.equal(entry.command, 'npx');
  assert.deepEqual(entry.args, ['-y', '--prefer-online', 'superskill@latest']);
  const launch = async () => {
    const result = await run(entry.command, entry.args, { cwd: work, env: { ...env, ...entry.env }, timeout: 45000 });
    return result.stdout.trim();
  };
  const first = await launch();
  assert.equal(first, 'superskill-update-smoke:1.0.0');
  latest = '1.0.1';
  const second = await launch();
  assert.equal(second, 'superskill-update-smoke:1.0.1');
  assert.ok(requests.some(request => request.path === '/superskill' && request.latest === '1.0.0'));
  assert.ok(requests.some(request => request.path === '/superskill' && request.latest === '1.0.1'));
  for (const version of ['1.0.0', '1.0.1']) assert.ok(requests.some(request => request.path.endsWith(`superskill-${version}.tgz`)));
  assert.ok(requests.every(request => request.path === '/superskill' || /^\/superskill\/-\/superskill-1\.0\.[01]\.tgz$/.test(request.path)));
  console.log(JSON.stringify({ success: true, first, second, sameCache: true, registry: 'isolated loopback registry', requests, scope: 'Updated package selected on next server launch; no global install or running-session replacement' }, null, 2));
} finally {
  await new Promise(resolve => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
