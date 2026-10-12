import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { readJsonConfig, writeJsonConfig, updateJsonConfig, addMcpEntry, removeMcpEntry } from "./json-config.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempDir(): string {
  const root = mkdtempSync(join(tmpdir(), "json-config-"));
  roots.push(root);
  return root;
}

describe("readJsonConfig", () => {
  it("returns parsed JSON when file exists", () => {
    const path = join(tempDir(), "config.json");
    writeFileSync(path, '{"mcpServers":{}}');
    expect(readJsonConfig(path)).toEqual({ mcpServers: {} });
  });

  it("returns empty object when file does not exist", () => {
    expect(readJsonConfig(join(tempDir(), "missing.json"))).toEqual({});
  });

  it("returns null when file has invalid JSON", () => {
    const path = join(tempDir(), "config.json");
    writeFileSync(path, "not json");
    expect(readJsonConfig(path)).toBeNull();
  });
});

describe("writeJsonConfig", () => {
  it("creates parent directories and writes formatted JSON without a backup for a new file", () => {
    const path = join(tempDir(), "nested", "config.json");
    writeJsonConfig(path, { key: "value" });
    expect(JSON.parse(readFileSync(path, "utf-8"))).toEqual({ key: "value" });
    expect(existsSync(`${path}.bak.superskill`)).toBe(false);
  });

  it("rotates the backup only when the content changes", () => {
    const path = join(tempDir(), "config.json");
    writeJsonConfig(path, { key: "one" });
    writeJsonConfig(path, { key: "two" });
    expect(JSON.parse(readFileSync(`${path}.bak.superskill`, "utf-8"))).toEqual({ key: "one" });

    writeFileSync(path, JSON.stringify({ key: "two" }, null, 2) + "\n");
    writeJsonConfig(path, { key: "two" });
    expect(JSON.parse(readFileSync(`${path}.bak.superskill`, "utf-8"))).toEqual({ key: "one" });
  });

  it("refuses to clobber an unparseable config", () => {
    const path = join(tempDir(), "config.json");
    writeFileSync(path, "{ broken");
    expect(() => writeJsonConfig(path, { key: "value" })).toThrow(/Refusing to overwrite unparseable JSON/);
    expect(readFileSync(path, "utf-8")).toBe("{ broken");
  });
});

describe("updateJsonConfig", () => {
  it("applies the mutation and reports whether it wrote", () => {
    const path = join(tempDir(), "config.json");
    expect(updateJsonConfig(path, (config) => ({ ...config, first: true }))).toBe(true);
    expect(updateJsonConfig(path, () => null)).toBe(false);
    expect(JSON.parse(readFileSync(path, "utf-8"))).toEqual({ first: true });
  });

  it("survives a second writer between read and rename by retrying the read-modify-write", () => {
    const path = join(tempDir(), "config.json");
    writeJsonConfig(path, { initial: true });
    let secondWriterRan = false;

    const written = updateJsonConfig(path, (config) => {
      if (!secondWriterRan) {
        secondWriterRan = true;
        writeFileSync(path, JSON.stringify({ initial: true, concurrent: true }, null, 2) + "\n");
      }
      return { ...config, superskill: { command: "npx" } };
    });

    expect(written).toBe(true);
    expect(secondWriterRan).toBe(true);
    expect(JSON.parse(readFileSync(path, "utf-8"))).toEqual({
      initial: true,
      concurrent: true,
      superskill: { command: "npx" },
    });
  });

  it("gives up with a clear error when the target keeps changing", () => {
    const path = join(tempDir(), "config.json");
    writeJsonConfig(path, { initial: true });
    let counter = 0;
    expect(() =>
      updateJsonConfig(path, (config) => {
        counter += 1;
        writeFileSync(path, JSON.stringify({ tick: counter }, null, 2) + "\n");
        return { ...config, superskill: true };
      })
    ).toThrow(/kept changing during write/);
    expect(counter).toBe(3);
  });
});

describe("addMcpEntry", () => {
  it("adds entry under correct root key", () => {
    const config = { mcpServers: {} };
    const result = addMcpEntry(config, "mcpServers", "superskill", { command: "npx" });
    expect(result.alreadyExists).toBe(false);
    expect(result.config.mcpServers["superskill"]).toEqual({ command: "npx" });
  });

  it("creates root key if missing", () => {
    const config = {};
    const result = addMcpEntry(config, "mcpServers", "superskill", { command: "npx" });
    expect(result.config.mcpServers["superskill"]).toEqual({ command: "npx" });
  });

  it("preserves existing entries", () => {
    const config = { mcpServers: { other: { command: "other" } } };
    const result = addMcpEntry(config, "mcpServers", "superskill", { command: "npx" });
    expect(result.config.mcpServers.other).toEqual({ command: "other" });
    expect(result.config.mcpServers["superskill"]).toEqual({ command: "npx" });
  });

  it("returns alreadyExists=true when entry present and force=false", () => {
    const config = { mcpServers: { "superskill": { command: "old" } } };
    const result = addMcpEntry(config, "mcpServers", "superskill", { command: "npx" }, false);
    expect(result.alreadyExists).toBe(true);
    expect(result.config.mcpServers["superskill"]).toEqual({ command: "old" });
  });
});

describe("removeMcpEntry", () => {
  it("removes the entry", () => {
    const config = { mcpServers: { "superskill": { command: "npx" }, other: { command: "x" } } };
    const result = removeMcpEntry(config, "mcpServers", "superskill");
    expect(result.config.mcpServers["superskill"]).toBeUndefined();
    expect(result.config.mcpServers.other).toEqual({ command: "x" });
    expect(result.removed).toBe(true);
  });

  it("returns removed=false when entry not found", () => {
    const config = { mcpServers: {} };
    const result = removeMcpEntry(config, "mcpServers", "superskill");
    expect(result.removed).toBe(false);
  });
});

describe("managed launcher upgrades", () => {
  const latest = { command: "npx", args: ["-y", "--prefer-online", "superskill@latest"], env: { VAULT_PATH: "/new" } };
  it("upgrades old generated launcher while preserving vault and custom settings", () => {
    const old = { command: "npx", args: ["-y", "superskill"], env: { VAULT_PATH: "/existing", EXTRA: "keep" }, timeout: 123 };
    const result = addMcpEntry({ mcpServers: { superskill: old, other: { command: "keep" } } }, "mcpServers", "superskill", latest);
    expect(result.alreadyExists).toBe(false);
    expect(result.config.mcpServers.superskill).toEqual({ ...old, args: latest.args });
    expect(result.config.mcpServers.other.command).toBe("keep");
  });
  it("upgrades the generated OpenCode command array only", () => {
    const old = { type: "local", command: ["npx", "-y", "superskill"], environment: { VAULT_PATH: "/existing", EXTRA: "keep" } };
    const next = { type: "local", command: ["npx", "-y", "--prefer-online", "superskill@latest"], environment: { VAULT_PATH: "/new" } };
    const result = addMcpEntry({ mcp: { superskill: old } }, "mcp", "superskill", next);
    expect(result.alreadyExists).toBe(false);
    expect(result.config.mcp.superskill).toEqual({ ...old, command: next.command });
  });
  it.each([
    { command: "superskill", env: { VAULT_PATH: "/existing" } },
    { command: "npx", args: ["-y", "superskill@0.9.0"], env: { VAULT_PATH: "/existing" } },
    { command: "npx", args: ["-y", "superskill", "--custom"], env: { VAULT_PATH: "/existing" } },
    { command: "npx", args: ["-y", "superskill"] },
  ])("preserves custom or pinned launchers", old => {
    const result = addMcpEntry({ mcpServers: { superskill: old } }, "mcpServers", "superskill", latest);
    expect(result.alreadyExists).toBe(true);
    expect(result.config.mcpServers.superskill).toEqual(old);
  });
});
