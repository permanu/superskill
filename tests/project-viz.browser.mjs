import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { writeKnowledgeGraphFiles } from '../dist/lib/knowledge-viz.js';

const root = await mkdtemp(join(tmpdir(), 'project-graph-browser-'));
await mkdir(join(root, 'web'), { recursive: true });
await mkdir(join(root, 'shared'), { recursive: true });
await writeFile(join(root, 'web/main.ts'), 'import { answer } from "../shared/record";\nexport function run() { return answer(); }\n' + '\n'.repeat(80) + 'export const lastLine = "SOURCE_END";');
await writeFile(join(root, 'shared/record.ts'), 'export interface Record { value: number }\nexport function answer(): Record { return { value: 42 }; }');
const vault = join(root, 'vault');
await mkdir(join(vault, 'projects/demo'), { recursive: true });
await writeFile(join(vault, 'projects/demo/context.md'), '---\ntype: context\n---\n# Project context\nA small browser fixture.');
const files = await writeKnowledgeGraphFiles(vault, 'demo', { codeRoot: root });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const failures = [];
const networkFailures = [];
const consoleErrors = [];
let activePage;
async function check(name, fn) {
  try { await fn(); console.log(`PASS ${name}`); }
  catch (error) {
    failures.push(name);
    console.error(`FAIL ${name}: ${error.message}`);
    console.error(JSON.stringify({ networkFailures, consoleErrors, state: await activePage?.evaluate(() => ({
      hash: location.hash,
      title: document.querySelector('#title')?.textContent,
      activeView: document.querySelector('#nav [aria-current]')?.getAttribute('data-view'),
      fallback: !document.querySelector('#fallback')?.hidden,
      cytoscapeLoaded: typeof window.cytoscape === 'function',
    })) }));
  }
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  activePage = page;
  page.setDefaultTimeout(10000);
  page.on('requestfailed', request => networkFailures.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => { if (!response.ok()) networkFailures.push({ url: response.url(), status: response.status() }); });
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(join(vault, files.html)).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  async function waitForNavigation(view, action) {
    await page.evaluate(expected => {
      window.__vizNavigation = location.hash === `#${expected}` ? Promise.resolve() : new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          window.removeEventListener('hashchange', onHashChange);
          reject(new Error(`Navigation did not finish: ${expected}`));
        }, 10000);
        const onHashChange = () => {
          if (location.hash !== `#${expected}`) return;
          window.removeEventListener('hashchange', onHashChange);
          clearTimeout(timeout);
          resolve();
        };
        window.addEventListener('hashchange', onHashChange);
      });
    }, view);
    await action();
    await page.evaluate(() => window.__vizNavigation);
  }
  async function navigate(view) {
    const section = ['graph'].includes(view) ? 'graph' : ['vault', 'catalog', 'rules'].includes(view) ? 'vault' : 'hla';
    await waitForNavigation(section, () => page.locator(`#nav [data-view="${section}"]`).click());
    if (view !== section) await waitForNavigation(view, () => page.getByRole('combobox', { name: 'View' }).selectOption(view));
    assert.equal(await page.locator('#nav [aria-current]').getAttribute('data-view'), section);
  }

  await check('primary navigation exposes only Explore, Architecture and Knowledge', async () => {
    assert.deepEqual(await page.locator('#nav button').allTextContents(), ['Explore', 'Architecture', 'Knowledge']);
  });
  await check('project directories open directly and breadcrumbs return to the project', async () => {
    await page.locator('#panel [data-id="dir:web/"]').click();
    assert.equal(await page.locator('#title').textContent(), 'web');
    assert.equal(await page.locator('#breadcrumbs [aria-current]').textContent(), 'web');
    await page.locator('#breadcrumbs button').first().click();
    assert.equal(await page.locator('#title').textContent(), 'demo');
  });
  await check('file nodes expose complete source and drill down to exact symbol spans', async () => {
    await page.locator('#panel [data-id="dir:web/"]').click();
    await page.locator('#panel [data-id="code:web/main.ts"]').click();
    assert.match(await page.locator('.source-code').textContent(), /SOURCE_END/);
    await page.locator('[data-open-graph="file:web/main.ts"]').click();
    const run = page.locator('#panel .node-item').filter({ hasText: /^run$/ });
    await run.click();
    assert.match(await page.locator('.source-code').textContent(), /function run/);
    assert.doesNotMatch(await page.locator('.source-code').textContent(), /SOURCE_END/);
    await page.getByRole('button', { name: 'Read full file', exact: true }).click();
    assert.match(await page.locator('.source-code').textContent(), /SOURCE_END/);
  });
  for (const view of ['hla', 'lla', 'erd', 'flow']) {
    await check(`${view} renders a project-derived SVG diagram`, async () => {
      await navigate(view);
      await page.locator('#doc-slot .diagram svg').first().waitFor();
      assert.equal(await page.locator('#doc-slot .code').count(), 0);
      assert.ok((await page.locator('#doc-slot svg').boundingBox()).width > 100);
      const beforeZoom = await page.locator('#doc-slot svg').first().evaluate(svg => svg.getBoundingClientRect().width);
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
      assert.ok(await page.locator('#doc-slot svg').first().evaluate(svg => svg.getBoundingClientRect().width) > beforeZoom);
      await page.getByRole('button', { name: 'Fit view', exact: true }).click();
      assert.doesNotMatch(await page.locator('#doc-slot').textContent(), /FTS5|Skill router/);
    });
  }
  await check('knowledge and playbooks are reachable and nested', async () => {
    await navigate('vault');
    await page.locator('#panel .node-item').filter({ hasText: 'Project context' }).click();
    assert.match(await page.locator('#panel').textContent(), /small browser fixture/);
    await navigate('catalog');
    await page.locator('#panel .node-item').first().click();
    assert.equal(await page.locator('#breadcrumbs button').count(), 3);
    assert.ok(await page.locator('#panel .node-item').count() > 0);
  });
  await check('mobile source traversal has no page overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await navigate('graph');
    await page.locator('#panel [data-id="dir:web/"]').click();
    await page.locator('#panel [data-id="code:web/main.ts"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.match(await page.locator('.source-code').textContent(), /SOURCE_END/);
  });
  await check('no uncaught browser errors', async () => assert.deepEqual(errors, []));
  if (process.argv[2]) {
    const artifactDir = process.argv[3] ?? '/tmp/superskill-project-viz';
    await mkdir(artifactDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(pathToFileURL(process.argv[2]).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    for (const view of ['graph', 'hla', 'lla', 'erd', 'flow', 'modules', 'vault', 'catalog', 'rules']) {
      await navigate(view);
      if (['hla', 'lla', 'erd', 'flow'].includes(view)) await page.locator('#doc-slot .diagram svg').first().waitFor({ timeout: 30000 });
      await page.screenshot({ path: join(artifactDir, `${view}.png`) });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await navigate('graph');
    await page.screenshot({ path: join(artifactDir, 'mobile.png'), fullPage: true });
  }
} finally {
  await browser.close();
  await rm(root, { recursive: true, force: true });
}
assert.deepEqual(failures, []);
