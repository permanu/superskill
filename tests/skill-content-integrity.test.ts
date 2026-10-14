import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const serverPath = fileURLToPath(new URL("../dist/mcp-server.js", import.meta.url));
const commands = [
  "printf 'prepare\\n'",
  "printf 'validate\\n'",
  "printf 'preview\\n'",
  "printf 'AUTHORIZATION_MARKER\\n'",
  "printf 'apply\\n'",
  "printf 'verify\\n'",
  "printf 'VERIFICATION_MARKER\\n'",
].join("\n");

describe("built skill authoring and delivery", () => {
  let root: string;
  let repo: string;
  let home: string;
  let vault: string;
  let client: Client;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "superskill-content-integrity-")));
    repo = join(root, "repo");
    home = join(root, "home");
    vault = join(home, "vault");
    const skill = join(repo, ".agents", "skills", "source-skill");
    await mkdir(join(skill, "references"), { recursive: true });
    await mkdir(join(vault, "projects", "fixture"), { recursive: true });
    await execFileAsync("git", ["init", "-q", "-b", "main"], {
      cwd: repo,
      env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
      timeout: 10_000,
    });
    await writeFile(join(repo, ".gitignore"), ".superskill/\n");
    await writeFile(join(vault, "project-map.json"), JSON.stringify({ [repo]: "fixture" }));
    await writeFile(join(skill, "SKILL.md"), [
      "---",
      "name: source-skill",
      "description: Preserves complete fixture workflows. Use when validating source delivery.",
      "---",
      "",
      "# Source skill",
      "",
      "Read the [reference](references/reference.md) when needed.",
      "",
      "```sh",
      commands,
      "```",
      "",
    ].join("\n"));
    await writeFile(join(skill, "references", "reference.md"), "# Reference\n\nSynthetic reference content.\n");
    const env = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined));
    client = new Client({ name: "skill-content-integrity", version: "1.0.0" });
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [serverPath],
      cwd: repo,
      env: { ...env, HOME: home, XDG_CONFIG_HOME: join(home, ".config"), VAULT_PATH: vault, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
      stderr: "pipe",
    }));
  });

  afterEach(async () => {
    await client?.close();
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("delivers complete fenced workflows through actual activation", async () => {
    const initialized = await client.callTool({ name: "init", arguments: { slug: "fixture" } });
    expect(initialized.isError).not.toBe(true);
    const result = await client.callTool({ name: "superskill", arguments: { skill_id: "native/source-skill", task: "Load this fixture skill", max_tokens: 8000 } });
    expect(result.isError).not.toBe(true);
    const parts = result.content as Array<{ type: string; text?: string }>;
    const record = JSON.parse(parts.find((part) => part.type === "text")?.text ?? "null") as { success: boolean; content: string };
    expect(record.success).toBe(true);
    const start = record.content.lastIndexOf("# Source skill");
    expect(start).toBeGreaterThanOrEqual(0);
    const deliveredSkill = record.content.slice(start);
    expect(deliveredSkill).toContain(`\`\`\`sh\n${commands}\n\`\`\``);
    expect(deliveredSkill).not.toMatch(/lines truncated/);
  });

  it("exposes real native validation and leaves inspected files unchanged", async () => {
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain("skill_validate");
    const path = join(repo, ".agents", "skills", "source-skill", "SKILL.md");
    const before = await readFile(path, "utf8");
    const result = await client.callTool({ name: "skill_validate", arguments: { path: ".agents/skills/source-skill", profile: "anthropic" } });
    expect(result.isError).not.toBe(true);
    const parts = result.content as Array<{ type: string; text?: string }>;
    const record = JSON.parse(parts.find((part) => part.type === "text")?.text ?? "null") as { valid: boolean };
    expect(record.valid).toBe(true);
    expect(await readFile(path, "utf8")).toBe(before);
  });

  it("opens principle and constitution targets without guessing package paths", async () => {
    for (const [id, path] of [
      ["constitution", "constitution.md"],
      ["principle:principle-make-illegal-states-unrepresentable", "principles/make-illegal-states-unrepresentable.md"],
    ]) {
      const result = await client.callTool({ name: "graph_traverse", arguments: { action: "open", id, full: true } });
      expect(result.isError).not.toBe(true);
      const parts = result.content as Array<{ type: string; text?: string }>;
      const record = JSON.parse(parts.find((part) => part.type === "text")?.text ?? "null") as { content: string; read_complete: boolean; next_offset_bytes: number | null };
      const expected = await readFile(fileURLToPath(new URL(`../catalog/${path}`, import.meta.url)), "utf8");
      expect(record.content).toBe(expected);
      expect(record.read_complete).toBe(true);
      expect(record.next_offset_bytes).toBeNull();
    }
  });

  it("reconstructs a long skill resource through transport-safe UTF-8 pages", async () => {
    const reference = "# Reference\n\n## Contents\n- [Payload](#payload)\n\n## Payload\n" + 'é🙂 "escaped" \\ value\n'.repeat(6000) + "END_REFERENCE\n";
    await writeFile(join(repo, ".agents", "skills", "source-skill", "references", "reference.md"), reference);
    const initialized = await client.callTool({ name: "init", arguments: { slug: "fixture" } });
    expect(initialized.isError).not.toBe(true);
    let offset = 0;
    let count = 0;
    const chunks: string[] = [];
    while (count < 100) {
      const result = await client.callTool({ name: "graph_traverse", arguments: {
        action: "open", id: "skill-resource:native/source-skill:references/reference.md", full: true, offset_bytes: offset, max_bytes: 200_000,
      } });
      expect(result.isError).not.toBe(true);
      const parts = result.content as Array<{ type: string; text?: string }>;
      const serialized = parts.find((part) => part.type === "text")?.text ?? "null";
      expect(Buffer.byteLength(serialized, "utf8")).toBeLessThanOrEqual(65536);
      const page = JSON.parse(serialized) as { bytes: number; offset_bytes: number; content_bytes: number; content: string; truncated: boolean; next_offset_bytes: number | null; read_complete: boolean };
      expect(page.bytes).toBe(Buffer.byteLength(reference, "utf8"));
      expect(page.offset_bytes).toBe(offset);
      expect(page.content_bytes).toBe(Buffer.byteLength(page.content, "utf8"));
      expect(page.truncated).toBe(!page.read_complete);
      chunks.push(page.content);
      count += 1;
      if (page.read_complete) {
        expect(page.next_offset_bytes).toBeNull();
        break;
      }
      expect(page.next_offset_bytes).toBe(offset + page.content_bytes);
      expect(page.next_offset_bytes).toBeGreaterThan(offset);
      if (page.next_offset_bytes === null) throw new Error("Incomplete resource page has no continuation cursor");
      offset = page.next_offset_bytes;
    }
    expect(count).toBeGreaterThan(1);
    expect(count).toBeLessThan(100);
    expect(chunks.join("")).toBe(reference);
  });
});
