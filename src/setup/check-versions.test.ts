import { afterEach, describe, expect, it } from "vitest";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const scriptPath = join(repoRoot, "scripts", "check-versions.mjs");

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function runScript(root: string): { status: number | null; stdout: string; stderr: string } {
  const target = join(root, "scripts", "check-versions.mjs");
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(scriptPath, target);
  const result = spawnSync(process.execPath, [target], { encoding: "utf-8" });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function fixture(versions: { pkg: string; plugin: string; metadata: string; pluginEntry: string }): string {
  const root = mkdtempSync(join(tmpdir(), "check-versions-"));
  roots.push(root);
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "superskill", version: versions.pkg }));
  mkdirSync(join(root, ".claude-plugin"), { recursive: true });
  writeFileSync(join(root, ".claude-plugin", "plugin.json"), JSON.stringify({ version: versions.plugin }));
  writeFileSync(
    join(root, ".claude-plugin", "marketplace.json"),
    JSON.stringify({ metadata: { version: versions.metadata }, plugins: [{ name: "superskill", version: versions.pluginEntry }] }),
  );
  return root;
}

describe("scripts/check-versions.mjs", () => {
  it("exits 0 when every manifest is in sync", () => {
    const result = runScript(fixture({ pkg: "1.2.3", plugin: "1.2.3", metadata: "1.2.3", pluginEntry: "1.2.3" }));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1.2.3");
  });

  it("exits 1 with a clear diff when any manifest drifts", () => {
    const result = runScript(fixture({ pkg: "2.0.0", plugin: "2.0.0", metadata: "1.9.9", pluginEntry: "2.0.0" }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("version mismatch");
    expect(result.stderr).toContain("package.json: 2.0.0");
    expect(result.stderr).toContain("marketplace.json metadata: 1.9.9");
  });

  it("exits 1 when a manifest is missing", () => {
    const root = fixture({ pkg: "1.0.0", plugin: "1.0.0", metadata: "1.0.0", pluginEntry: "1.0.0" });
    rmSync(join(root, ".claude-plugin", "plugin.json"));
    const result = runScript(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("cannot read .claude-plugin/plugin.json");
  });

  it("matches the repository's actual version state", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf-8")) as { version: string };
    const plugin = JSON.parse(readFileSync(join(repoRoot, ".claude-plugin", "plugin.json"), "utf-8")) as { version: string };
    const marketplace = JSON.parse(readFileSync(join(repoRoot, ".claude-plugin", "marketplace.json"), "utf-8")) as {
      metadata: { version: string };
      plugins: Array<{ version: string }>;
    };
    const inSync =
      pkg.version === plugin.version &&
      pkg.version === marketplace.metadata.version &&
      marketplace.plugins.every((entry) => entry.version === pkg.version);
    const result = spawnSync(process.execPath, [scriptPath], { cwd: repoRoot, encoding: "utf-8" });
    expect(result.status).toBe(inSync ? 0 : 1);
  });
});
