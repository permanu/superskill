import { afterEach, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, rm, readFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const execute = promisify(execFile);
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

it("registers a fresh vault and calls project context without MCP", async () => {
  const root = await mkdtemp(join(tmpdir(), "direct-cli-"));
  roots.push(root);
  const workspace = join(root, "repo with spaces");
  await mkdir(workspace);
  const env = { ...process.env, HOME: root, VAULT_PATH: join(root, "new-vault") };
  const call = async (tool: string, args: unknown) => JSON.parse((await execute(process.execPath, [resolve("dist/main.js"), "invoke", tool, "--json", JSON.stringify(args)], { env }).catch(error => { throw new Error(error.stdout || error.message); })).stdout);
  const first = await call("register", { path: workspace });
  expect(first.changed).toBe(true);
  expect((await call("register", { path: workspace })).changed).toBe(false);
  const context = await call("project_context", { workspace_path: workspace });
  expect(context.project_slug).toBe(first.slug);
  expect(JSON.parse(await readFile(join(root, "new-vault", "project-map.json"), "utf8"))[await realpath(workspace)]).toBe(first.slug);
});

it("configures clients before their first launch with piped install output", async () => {
  const root = await mkdtemp(join(tmpdir(), "install-cli-"));
  roots.push(root);
  const env = { ...process.env, HOME: root, VAULT_PATH: join(root, "vault") };
  await execute(process.execPath, [resolve("dist/setup/postinstall.js")], { env });
  const codex = await readFile(join(root, ".codex", "config.toml"), "utf8");
  expect(codex).toContain("[mcp_servers.superskill]");
  await execute(process.execPath, [resolve("dist/setup/postinstall.js")], { env });
  expect(await readFile(join(root, ".codex", "config.toml"), "utf8")).toBe(codex);
});
