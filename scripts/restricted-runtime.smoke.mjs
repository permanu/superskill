import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, realpath, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const exec = promisify(execFile);
const root = await realpath(await mkdtemp(join(tmpdir(), "superskill-restricted-smoke-")));
const workspace = join(root, "workspace");
const vault = join(root, "project");
const audit = join(root, "audit.jsonl");
const launcher = fileURLToPath(new URL("./run-restricted.mjs", import.meta.url));
let client;
try {
  await mkdir(join(workspace, ".superskill"), { recursive: true });
  await mkdir(vault);
  await writeFile(join(workspace, ".gitignore"), ".superskill/\n");
  await exec("git", ["init", "-q", "-b", "main"], { cwd: workspace, env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" } });
  await writeFile(join(vault, "context.md"), "# synthetic-private-context-canary\n");
  await mkdir(join(workspace, ".agents/skills/unapproved"), { recursive: true });
  await writeFile(join(workspace, ".agents/skills/unapproved/SKILL.md"), "---\nname: unapproved\ndescription: Synthetic fixture\n---\n# harmless but not approved\n");
  const args = [launcher, "--workspace", workspace, "--project-vault", vault];
  const probe = await exec(process.execPath, [...args, "--probe"], { timeout: 30000 });
  const checks = JSON.parse(probe.stdout.trim());
  assert.ok(Object.values(checks).every(value => value === true));
  const transport = new StdioClientTransport({ command: process.execPath, args: [...args, "--audit-log", audit], stderr: "pipe" });
  let stderr = "";
  client = new Client({ name: "restricted-smoke", version: "1.0.0" });
  await client.connect(transport);
  const expectedVersion = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).version;
  assert.equal(client.getServerVersion()?.version, expectedVersion);
  assert.ok(client.getInstructions()?.includes("Restricted deployment"));
  assert.ok(transport.stderr);
  transport.stderr.on("data", chunk => { stderr += chunk.toString(); });
  assert.deepEqual((await client.listTools()).tools.map(tool => tool.name).sort(), ["graph_traverse", "project_context", "read", "superskill"]);
  const note = await client.callTool({ name: "read", arguments: { path: "context.md" } });
  assert.equal(note.isError, undefined);
  assert.equal(JSON.stringify(note).includes("synthetic-private-context-canary"), true);
  for (const request of [
    { name: "write", arguments: { path: "forbidden.md", content: "blocked" } },
    { name: "skill_install", arguments: { source: "owner/repo" } },
    { name: "read", arguments: { path: "projects/other/context.md" } },
  ]) assert.equal((await client.callTool(request)).isError, true);
  const routed = await client.callTool({ name: "superskill", arguments: { task: "review project scope", max_tokens: 6000 } });
  assert.notEqual(routed.isError, true);
  const unapproved = await client.callTool({ name: "superskill", arguments: { skill_id: "native/unapproved", max_tokens: 6000 } });
  assert.equal(unapproved.isError, true);
  const priorAudit = join(root, "prior-audit.jsonl");
  await rename(audit, priorAudit);
  await writeFile(audit, "replacement", { mode: 0o600 });
  let auditFailureClosed = false;
  try { await client.callTool({ name: "read", arguments: { path: "context.md" } }); }
  catch { auditFailureClosed = true; }
  assert.equal(auditFailureClosed, true);
  await client.close(); client = undefined;
  assert.equal(await readFile(audit, "utf8"), "replacement");
  const records = await readFile(priorAudit, "utf8");
  assert.equal(records.includes("synthetic-private-context-canary"), false);
  assert.equal(stderr.includes("synthetic-private-context-canary"), false);
  assert.ok(records.includes("request-admitted") && records.includes("response-prepared"));
  assert.deepEqual(await readdir(join(workspace, ".superskill")), []);
  assert.equal((await readdir(vault)).includes("forbidden.md"), false);
  console.log(JSON.stringify({ kernelChecks: checks, mcpIsolation: "passed", durableMetadataAudit: "passed", auditFailureClosed: "passed", ephemeralRoutingState: "passed", unapprovedSkillsBlocked: "passed" }));
} finally {
  await client?.close();
  await rm(root, { recursive: true, force: true });
}
