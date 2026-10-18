import { afterEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { buildMcpEntry, buildTomlBlock } from "./configure.js";
import { addMcpEntry } from "./json-config.js";
import { insertTomlBlock, reconcileTomlBlock } from "./toml-config.js";

const roots: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("MCP launch environment", () => {
  it.each(["string", "array"] as const)("launches %s entries without the desktop app loading NVM", (type) => {
    const root = mkdtempSync(join(tmpdir(), "superskill runtime "));
    roots.push(root);
    const nvmBin = join(root, ".nvm/versions/node/v26.12.0/bin");
    const bunBin = join(root, ".bun/bin");
    mkdirSync(nvmBin, { recursive: true });
    mkdirSync(bunBin, { recursive: true });
    symlinkSync(process.execPath, join(nvmBin, "node"));
    writeFileSync(join(nvmBin, "npx"), '#!/usr/bin/env node\nconsole.log(JSON.stringify({args:process.argv.slice(2),vault:process.env.VAULT_PATH}))\n', { mode: 0o755 });
    vi.stubEnv("PATH", [bunBin, nvmBin].join(delimiter));
    const key = type === "array" ? "environment" : "env";
    const execPath = process.execPath;
    let entry: Record<string, unknown>;
    try {
      process.execPath = join(nvmBin, "node");
      entry = buildMcpEntry(type, key, "/fixture vault");
    } finally {
      process.execPath = execPath;
    }
    const command = typeof entry.command === "string" ? entry.command : (entry.command as string[])[0];
    const args = typeof entry.command === "string" ? entry.args as string[] : (entry.command as string[]).slice(1);
    expect(() => execFileSync(command, args, { env: { PATH: join(root, "desktop-path") }, timeout: 5000 })).toThrow();
    const output = execFileSync(command, args, { env: entry[key] as NodeJS.ProcessEnv, encoding: "utf8", timeout: 5000 });
    expect(JSON.parse(output)).toEqual({ args: ["-y", "--prefer-online", "superskill@latest"], vault: "/fixture vault" });
  });

  it("records absolute executable directories without current-directory search or unrelated environment", () => {
    vi.stubEnv("PATH", ["", ".", "relative/bin", "/fixture/nvm/bin", "/fixture/nvm/bin"].join(delimiter));
    vi.stubEnv("FIXTURE_SECRET", "must-not-be-copied");
    const env = buildMcpEntry("string", "env", "/vault").env as Record<string, string>;
    expect(Object.keys(env).sort()).toEqual(["PATH", "VAULT_PATH"]);
    const paths = env.PATH.split(delimiter);
    expect(paths[0]).toBe(dirname(process.execPath));
    expect(paths).toContain("/fixture/nvm/bin");
    expect(paths).not.toContain("");
    expect(paths).not.toContain(".");
    expect(paths).not.toContain("relative/bin");
    expect(new Set(paths).size).toBe(paths.length);
  });

  it.each(["string", "array"] as const)("repairs existing default %s entries without replacing vault or custom environment", (type) => {
    const key = type === "array" ? "environment" : "env";
    const desired = buildMcpEntry(type, key, "/new-vault");
    const existing = { ...desired, [key]: { VAULT_PATH: "/existing-vault", CUSTOM: "keep" } };
    const result = addMcpEntry({ mcp: { superskill: existing } }, "mcp", "superskill", desired);
    expect(result.alreadyExists).toBe(false);
    expect(result.config.mcp.superskill[key]).toEqual({ VAULT_PATH: "/existing-vault", CUSTOM: "keep", PATH: (desired[key] as Record<string, string>).PATH });
    expect(addMcpEntry(result.config, "mcp", "superskill", desired).alreadyExists).toBe(true);
    const custom = { ...existing, [key]: { VAULT_PATH: "/existing-vault", CUSTOM: "keep", PATH: "/custom/path" } };
    expect(addMcpEntry({ mcp: { superskill: custom } }, "mcp", "superskill", desired).config.mcp.superskill).toEqual(custom);
  });

  it.each([false, true])("repairs default TOML entries (marked=%s), preserves settings, and remains idempotent", (marked) => {
    const block = '[mcp_servers.superskill]\ncommand = "npx"\nargs = ["-y", "--prefer-online", "superskill@latest"]\nstartup_timeout_sec = 30\n\n[mcp_servers.superskill.env]\nVAULT_PATH = "/existing-vault"\nCUSTOM = "keep"';
    const content = marked ? insertTomlBlock("", block)! : block + '\n\n[unrelated]\nvalue = "keep"\n';
    const desired = buildTomlBlock("/new-vault");
    const updated = reconcileTomlBlock(content, desired)!;
    expect(updated).toContain("PATH = ");
    expect(updated).toContain('VAULT_PATH = "/existing-vault"');
    expect(updated).toContain('CUSTOM = "keep"');
    expect(updated).toContain("startup_timeout_sec = 30");
    if (!marked) expect(updated).toContain('[unrelated]\nvalue = "keep"');
    expect(reconcileTomlBlock(updated, desired)).toBeNull();
    const custom = content.replace('CUSTOM = "keep"', 'CUSTOM = "keep"\nPATH = "/custom/path"');
    expect(reconcileTomlBlock(custom, desired)).toBeNull();
  });

  it.each([false, true])("adds a missing TOML environment table (marked=%s)", (marked) => {
    const block = '[mcp_servers.superskill]\ncommand = "npx"\nargs = ["-y", "--prefer-online", "superskill@latest"]';
    const content = marked ? insertTomlBlock("", block)! : block + '\n\n[unrelated]\nvalue = "keep"\n';
    const updated = reconcileTomlBlock(content, buildTomlBlock("/vault"))!;
    expect(updated).toContain('[mcp_servers.superskill.env]\nPATH = ');
    if (marked) expect(updated.indexOf("PATH = ")).toBeLessThan(updated.indexOf("# superskill:end"));
    else expect(updated).toContain('[unrelated]\nvalue = "keep"');
    expect(reconcileTomlBlock(updated, buildTomlBlock("/vault"))).toBeNull();
  });

  it.each(["superskill@0.16.0", "superskill@next", "superskill@latest --custom"])("preserves customized and pinned launch environments (%s)", (target) => {
    const args = ["-y", ...target.split(" ")];
    const entry = { command: "npx", args, env: { VAULT_PATH: "/existing-vault" } };
    expect(addMcpEntry({ mcp: { superskill: entry } }, "mcp", "superskill", buildMcpEntry("string", "env", "/new-vault")).config.mcp.superskill).toEqual(entry);
    const block = `[mcp_servers.superskill]\ncommand = "npx"\nargs = ${JSON.stringify(args)}\n\n[mcp_servers.superskill.env]\nVAULT_PATH = "/existing-vault"`;
    expect(reconcileTomlBlock(block, buildTomlBlock("/new-vault"))).toBeNull();
  });
});
