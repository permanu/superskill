import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { VaultFS } from "../src/lib/vault-fs.js";

const run = promisify(execFile);
const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

describe("native CLI validation in a clean unmapped checkout", () => {
  let root: string;
  let repo: string;
  let home: string;
  let vault: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "superskill-native-unmapped-")));
    repo = join(root, "repo");
    home = join(root, "home");
    vault = join(home, "vault");
    await mkdir(join(repo, "skills", "fixture", "references"), { recursive: true });
    await mkdir(vault, { recursive: true });
    env = { ...process.env, HOME: home, XDG_CONFIG_HOME: join(home, ".config"), VAULT_PATH: vault, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
    await run("git", ["init", "-q", "-b", "main"], { cwd: repo, env, timeout: 10_000 });
    await writeFile(join(repo, "skills", "fixture", "SKILL.md"), "---\nname: fixture\ndescription: Checks fixture instructions. Use when validating a fictional workflow.\n---\n\n# Fixture\nRead the [reference](references/sample.md).\n");
    await writeFile(join(repo, "skills", "fixture", "references", "sample.md"), "# Reference\n\nSynthetic fixture.\n");
  });

  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("validates local skills without creating a vault project mapping", async () => {
    const file = join(repo, "skills", "fixture", "SKILL.md");
    const before = await readFile(file, "utf8");
    const { stdout } = await run(process.execPath, [cli, "skill", "validate", "skills/fixture/SKILL.md", "--profile", "anthropic"], { cwd: repo, env, timeout: 30_000 });
    const report = JSON.parse(stdout);
    expect(report.valid).toBe(true);
    expect(report.counts.errors).toBe(0);
    expect(report.checked_paths).toContain("skills/fixture/SKILL.md");
    expect(await readFile(file, "utf8")).toBe(before);
    expect(await new VaultFS(vault).exists("project-map.json")).toBe(false);
  });

  it("still rejects escaping references without a project mapping", async () => {
    await writeFile(join(repo, "skills", "fixture", "SKILL.md"), "---\nname: fixture\ndescription: Checks fixture instructions. Use when validating a fictional workflow.\n---\n\nRead [outside](../outside.md).\n");
    let output: string | undefined;
    try {
      await run(process.execPath, [cli, "skill", "validate", "skills/fixture/SKILL.md"], { cwd: repo, env, timeout: 30_000 });
    } catch (error) {
      const failure = error as Error & { code?: number; stdout?: string };
      expect(failure.code).toBe(1);
      output = failure.stdout;
    }
    expect(output).toBeDefined();
    const report = JSON.parse(output!);
    expect(report.valid).toBe(false);
    expect(report.issues.some((issue: { code: string }) => issue.code === "reference.escape")).toBe(true);
    expect(await new VaultFS(vault).exists("project-map.json")).toBe(false);
  });
});
