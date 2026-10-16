import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const serverPath = fileURLToPath(new URL("../dist/mcp-server.js", import.meta.url));

describe("built MCP security boundaries", () => {
  let base: string;
  let home: string;
  let vault: string;
  let alpha: string;
  let unmapped: string;
  const clients: Client[] = [];

  beforeEach(async () => {
    base = await realpath(await mkdtemp(join(tmpdir(), "superskill-mcp-boundaries-")));
    home = join(base, "home");
    vault = join(home, "vault");
    alpha = join(base, "alpha");
    unmapped = join(base, "unmapped");
    const beta = join(base, "beta");
    for (const path of [alpha, beta, unmapped, join(vault, "coordination"), join(vault, "projects", "alpha"), join(vault, "projects", "beta")]) {
      await mkdir(path, { recursive: true });
    }
    for (const path of [alpha, beta]) {
      await execFileAsync("git", ["init", "-q", "-b", "main"], {
        cwd: path,
        env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
        timeout: 10_000,
      });
    }
    await writeFile(join(vault, "project-map.json"), JSON.stringify({ [alpha]: "alpha", [beta]: "beta" }));
    await writeFile(join(vault, "projects", "alpha", "context.md"), "# Alpha context\n");
    await writeFile(join(vault, "projects", "beta", "context.md"), "# Other project confidential marker\n");
    await writeFile(join(vault, "shared.md"), "# Unmapped note\n");
    await writeFile(join(vault, "projects", "beta", "backlink.md"), "[[shared]]\n");
    await writeFile(join(vault, "coordination", "private.md"), "private coordination marker\n");
  });

  afterEach(async () => {
    await Promise.allSettled(clients.splice(0).map((client) => client.close()));
    if (base) await rm(base, { recursive: true, force: true });
  });

  async function connect(cwd: string, extraEnv: Record<string, string> = {}): Promise<Client> {
    const env = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined));
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverPath],
      cwd,
      env: {
        ...env,
        HOME: home,
        XDG_CONFIG_HOME: join(home, ".config"),
        VAULT_PATH: vault,
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_NOSYSTEM: "1",
        ...extraEnv,
      },
      stderr: "pipe",
    });
    const client = new Client({ name: "security-boundaries", version: "1.0.0" });
    clients.push(client);
    await client.connect(transport);
    return client;
  }

  it("enforces host tool policy across calls and indirect resources", async () => {
    const client = await connect(alpha, { SUPERSKILL_MCP_ALLOWED_TOOLS: JSON.stringify(["read", "project_context"]) });
    expect((await client.listTools()).tools.map(tool => tool.name).sort()).toEqual(["project_context", "read"]);
    const allowed = await client.callTool({ name: "read", arguments: { path: "context.md" } });
    expect(allowed.isError).not.toBe(true);
    for (const request of [
      { name: "write", arguments: { path: "denied.md", content: "must not persist" } },
      { name: "skill_install", arguments: { source: "owner/repo" } },
    ]) {
      const denied = await client.callTool(request);
      expect(denied.isError).toBe(true);
      expect(JSON.stringify(denied)).toContain("PERMISSION_DENIED");
    }
    const sessions = await client.readResource({ uri: "vault://coordination/active-sessions" });
    expect(JSON.stringify(sessions)).toContain("PERMISSION_DENIED");
    await expect(readFile(join(vault, "projects/alpha/denied.md"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("denies unmapped vault and backlink access without disclosing sibling projects", async () => {
    const client = await connect(unmapped);
    for (const request of [
      { name: "read", arguments: { path: "coordination/private.md" } },
      { name: "graph_related", arguments: { path: "shared.md" } },
    ]) {
      const result = await client.callTool(request);
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result)).not.toContain("private coordination marker");
      expect(JSON.stringify(result)).not.toContain("projects/beta/backlink.md");
    }
  });

  it("does not let an explicit project redirect workspace-derived output into a sibling jail", async () => {
    const client = await connect(alpha);
    const denied = await client.callTool({ name: "read", arguments: { path: "projects/beta/context.md" } });
    expect(denied.isError).toBe(true);
    const explicit = await client.callTool({ name: "knowledge_viz", arguments: { project: "beta" } });
    expect(explicit.isError).toBe(true);
    expect(JSON.stringify(explicit)).not.toContain("Other project confidential marker");
    expect((await readdir(join(vault, "projects", "beta"))).sort()).toEqual(["backlink.md", "context.md"]);
    const own = await client.callTool({ name: "read", arguments: { path: "context.md" } });
    expect(own.isError).not.toBe(true);
    expect(JSON.stringify(own)).toContain("Alpha context");
  });

  it("rejects malformed evidence before creating a passing record", async () => {
    const client = await connect(alpha);
    const result = await client.callTool({
      name: "evidence",
      arguments: { action: "add", ticket: "ticket-001", command: "false", exit: "1" },
    });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain("INVALID_ARGUMENT");
    expect(await readdir(join(vault, "projects", "alpha", "evidence")).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return [];
    })).toEqual([]);
  });

  it("requires consent before enabling telemetry through MCP", async () => {
    const client = await connect(alpha, { SUPERSKILL_TELEMETRY: "0" });
    const result = await client.callTool({ name: "telemetry", arguments: { action: "enable" } });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain("INVALID_ARGUMENT");
    const settings = await readFile(join(home, ".superskill", "telemetry", "settings.json"), "utf8").catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return "{}";
    });
    expect(JSON.parse(settings).enabled).not.toBe(true);
  });

  it("never evaluates executable-labelled metadata from vault notes", async () => {
    await mkdir(join(vault, "projects", "alpha", "tasks"));
    await writeFile(join(vault, "projects", "alpha", "tasks", "task-999-executable.md"), [
      "---js",
      "(() => ({ type: 'task', status: 'backlog', priority: 'p1' }))()",
      "---",
      "# Executed metadata marker",
    ].join("\n"));
    const client = await connect(alpha);
    const result = await client.callTool({ name: "task", arguments: { action: "list" } });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result)).not.toContain("Executed metadata marker");
  });

  it("keeps oversized structured responses valid JSON", async () => {
    await mkdir(join(vault, "projects", "alpha", "tasks"));
    for (let index = 1; index <= 20; index++) {
      const number = String(index).padStart(3, "0");
      await writeFile(join(vault, "projects", "alpha", "tasks", `task-${number}-boundary.md`), [
        "---",
        `id: task-${number}`,
        "type: task",
        `title: ${"bounded response ".repeat(30)}${number}`,
        "status: backlog",
        "priority: p1",
        "created: 2026-01-01",
        "---",
        `# Boundary task ${"bounded response ".repeat(30)}${number}`,
      ].join("\n"));
    }
    const client = await connect(alpha, { SUPERSKILL_MAX_RESPONSE_BYTES: "2048" });
    const result = await client.callTool({ name: "task", arguments: { action: "list" } });
    expect(result.isError).not.toBe(true);
    const content = result.content as Array<{ type: string; text?: string }>;
    const text = content.find((part) => part.type === "text")?.text ?? "";
    expect(Buffer.byteLength(text)).toBeLessThanOrEqual(2048);
    expect(() => JSON.parse(text)).not.toThrow();
    expect(JSON.parse(text).truncated).toBe(true);
  });
});
