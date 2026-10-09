import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { buildVizModel } from '../dist/lib/viz-model.js';
import { renderKnowledgeGraphHtml } from '../dist/lib/knowledge-viz.js';

const dir = await mkdtemp(join(tmpdir(), 'superskill-viz-browser-'));
const model = buildVizModel({ slug: 'superskill', vault: { nodes: [], edges: [] }, docs: [], code: { nodes: [], edges: [] } });
await writeFile(join(dir, 'graph.html'), renderKnowledgeGraphHtml(model));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const failures = [];
const networkFailures = [];
const consoleErrors = [];
let activePage;
const artifactDir = process.argv[2];
if (artifactDir) await mkdir(artifactDir, { recursive: true });
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
      zoomHidden: document.querySelector('#zoom-controls')?.hidden,
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
  await page.goto(pathToFileURL(join(dir, 'graph.html')).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#panel .node-item').first().waitFor();
  async function navigate(view) {
    await page.locator(`[data-view="${view}"]`).click();
    await page.waitForFunction(expected => document.querySelector('#nav [aria-current]')?.getAttribute('data-view') === expected, view);
  }
  if (artifactDir) {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(artifactDir, 'desktop.png') });
    await writeFile(join(artifactDir, 'graph.html'), renderKnowledgeGraphHtml(model));
  }
  await check('search has an accessible name', async () => {
    assert.equal(await page.getByRole('searchbox', { name: 'Search nodes' }).count(), 1);
  });
  await check('type filters preserve keyboard focus', async () => {
    const chip = page.locator('#chips button').first();
    await chip.focus(); await page.keyboard.press('Enter');
    assert.equal(await chip.getAttribute('aria-pressed'), 'false');
    assert.equal(await chip.evaluate(el => el === document.activeElement), true);
    await chip.click();
  });
  await check('node details have a keyboard return path', async () => {
    await page.locator('#panel .node-item').first().click();
    const back = page.getByRole('button', { name: 'All nodes', exact: true });
    assert.equal(await back.count(), 1);
    await back.click();
    assert.equal(await page.locator('#panel .node-item').count(), 9);
    await page.locator('#panel .node-item').first().click();
    await page.locator('#back').click();
    assert.equal(await page.locator('#panel .node-item').count(), 9);
  });
  await check('no-match state clears when opening diagrams', async () => {
    await page.locator('#search').fill('nothing-matches-this');
    assert.equal(await page.locator('#empty').isVisible(), true);
    await navigate('hla');
    assert.equal(await page.locator('#empty').isVisible(), false);
  });
  await check('diagram-to-graph navigation waits for the rendered view', async () => {
    const transition = await page.evaluate(() => {
      document.querySelector('[data-view="graph"]').click();
      return { hash: location.hash, activeView: document.querySelector('#nav [aria-current]')?.getAttribute('data-view'), zoomHidden: document.querySelector('#zoom-controls').hidden };
    });
    console.log(`Navigation scheduling evidence: ${JSON.stringify(transition)}`);
    await page.waitForFunction(() => document.querySelector('#nav [aria-current]')?.getAttribute('data-view') === 'graph');
    await page.getByRole('button', { name: 'Zoom in', exact: true }).waitFor();
    assert.equal(await page.locator('#fallback').isVisible(), false);
  });
  await check('zoom controls are available', async () => {
    assert.equal(await page.getByRole('button', { name: 'Zoom in', exact: true }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Zoom out', exact: true }).count(), 1);
    const before = Number.parseInt(await page.locator('#zoom-level').textContent(), 10);
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    assert.ok(Number.parseInt(await page.locator('#zoom-level').textContent(), 10) > before);
    await page.getByRole('button', { name: 'Fit view', exact: true }).click();
  });
  await check('mobile keeps canvas usable without horizontal page overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    const bounds = await page.locator('#canvas-wrap').boundingBox();
    assert.ok(bounds.width >= 350, `canvas width ${bounds.width}`);
    assert.ok(bounds.height >= 350, `canvas height ${bounds.height}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('button', { name: 'Fit view', exact: true }).click();
    if (artifactDir) await page.screenshot({ path: join(artifactDir, 'mobile.png'), fullPage: true });
  });
  await check('empty graphs explain their state', async () => {
    await navigate('graph');
    await page.locator('#panel [data-id="arch:vault"]').click();
    await page.locator('[data-open-graph="vault"]').click();
    assert.equal(await page.locator('#empty').isVisible(), true);
    assert.match(await page.locator('#empty').textContent(), /No nodes yet/);
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await check('rules drilldown clears search and supports back navigation', async () => {
    await navigate('rules');
    await page.locator('#search').fill('rust');
    await page.locator('#panel [data-id="rules:rust"]').click();
    await page.locator('[data-open-graph="rules:rust"]').click();
    assert.equal(await page.locator('#search').inputValue(), '');
    assert.ok(await page.locator('#panel .node-item:visible').count() > 0);
    await page.locator('#back').click();
    assert.equal(await page.locator('#panel [data-id="rules:rust"]').count(), 1);
    if (artifactDir) {
      await page.waitForFunction(() => Number.parseInt(document.querySelector('#zoom-level').textContent, 10) > 0);
      await page.screenshot({ path: join(artifactDir, 'rules.png') });
    }
  });
  await check('browser has no uncaught errors', async () => assert.deepEqual(errors, []));
  const offline = await browser.newPage();
  await offline.route('https://**/*', route => route.abort());
  await offline.goto(pathToFileURL(join(dir, 'graph.html')).href);
  await check('offline fallback remains searchable and selectable', async () => {
    assert.equal(await offline.locator('#fallback').isVisible(), true);
    await offline.locator('#search').fill('Vault memory');
    assert.equal(await offline.locator('#fallback .node-row:visible').count(), 1);
    await offline.locator('#fallback .node-item:visible').click();
    assert.match(await offline.locator('#panel').textContent(), /Vault memory/);
  });
} finally {
  await browser.close();
  await rm(dir, { recursive: true, force: true });
}
assert.deepEqual(failures, []);
