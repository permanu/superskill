import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { estimateTokens } from '../dist/lib/token-estimator.js';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const transport = new StdioClientTransport({ command: process.execPath, args: [join(repo, 'dist/mcp-server.js')], cwd: repo, stderr: 'pipe' });
const client = new Client({ name: 'superskill-local-smoke', version: '1.0.0' });
transport.stderr?.on('data', () => {});
async function call(name, args) {
  const result = await client.callTool({ name, arguments: args });
  assert.ok(!result.isError, `${name}: ${JSON.stringify(result.content)}`);
  const text = result.content.find(item => item.type === 'text')?.text;
  assert.ok(text);
  return { text, data: JSON.parse(text) };
}
try {
  await client.connect(transport);
  assert.match(client.getInstructions(), /metadata/);
  const invalidWorkspace = await client.callTool({ name: 'session', arguments: { action: 'register', tool: 'codex', workspace_path: [] } });
  assert.equal(invalidWorkspace.isError, true);
  assert.match(invalidWorkspace.content.find(item => item.type === 'text').text, /workspace_path/);
  const resolved = await call('graph_traverse', { action: 'resolve', task: 'formatSystemBrief', limit: 5 });
  const symbol = resolved.data.items.find(item => item.kind === 'code' && item.id.startsWith('symbol:') && item.id.includes('formatSystemBrief'));
  assert.ok(symbol, 'resolve must find the source symbol');
  assert.ok(resolved.data.items.every(item => !('content' in item) && !('body' in item)));
  const opened = await call('graph_traverse', { action: 'open', id: symbol.id });
  assert.match(opened.data.content, /function formatSystemBrief/);
  assert.ok(Buffer.byteLength(opened.data.content) <= 4096);
  const file = await readFile(join(repo, symbol.path), 'utf8');
  assert.ok(Buffer.byteLength(opened.data.content) < Buffer.byteLength(file));
  const activation = await call('superskill', { task: 'review parser boundaries', phase: 'review', files: ['src/lib/graph/loader.ts'], workspace_path: repo, max_tokens: 1200 });
  assert.equal(activation.data.success, true);
  assert.equal(activation.data.worktree.workspacePath, repo);
  assert.equal(activation.data.worktree.status, "available");
  assert.ok(activation.data.budget.content_estimated_tokens <= 1200);
  assert.equal(activation.data.budget.response_estimated_tokens, estimateTokens(activation.text));
  assert.ok(!('rules_plan' in activation.data));
  const detailed = await call('superskill', { task: 'review parser boundaries', phase: 'review', files: ['src/lib/graph/loader.ts'], workspace_path: repo, max_tokens: 1200, detail: 'full' });
  assert.equal(detailed.data.success, true, detailed.text);
  assert.ok('rules_plan' in detailed.data);
  assert.ok(activation.text.length < detailed.text.length);
  console.log(JSON.stringify({
    symbol: symbol.id,
    metadata_response_bytes: Buffer.byteLength(resolved.text),
    opened_source_bytes: Buffer.byteLength(opened.data.content),
    full_source_file_bytes: Buffer.byteLength(file),
    activation_content_estimated_tokens: activation.data.budget.content_estimated_tokens,
    compact_response_estimated_tokens: estimateTokens(activation.text),
    diagnostic_response_estimated_tokens: estimateTokens(detailed.text),
  }, null, 2));
} finally {
  await client.close();
}
