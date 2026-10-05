import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  HOOK_END,
  HOOK_START,
  detectHookManager,
  hookBlock,
  installPostCheckoutHook,
  isHookInstalled,
  postCheckoutPath,
  uninstallPostCheckoutHook,
} from "./hooks.js";
import { readHookState, writeHookState } from "./state.js";
import { repoStateDir } from "./paths.js";

const execFileAsync = promisify(execFile);

const ISOLATED_ENV_KEYS = ["HOME", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM", "XDG_CONFIG_HOME"] as const;

function isolatedGitEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, env: isolatedGitEnv(), timeout: 15000 });
  return stdout;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function waitForFile(path: string, timeoutMs = 3000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await exists(path)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

describe("worktree hooks", () => {
  let base: string;
  let repo: string;
  const savedEnv: Partial<Record<(typeof ISOLATED_ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-hooks-"));
    for (const key of ISOLATED_ENV_KEYS) {
      savedEnv[key] = process.env[key];
    }
    process.env.HOME = join(base, "home");
    process.env.XDG_CONFIG_HOME = join(base, "xdg");
    process.env.GIT_CONFIG_GLOBAL = "/dev/null";
    process.env.GIT_CONFIG_NOSYSTEM = "1";
    repo = join(base, "repo");
    await mkdir(repo);
    await git(repo, ["init", "-q", "-b", "main"]);
    await writeFile(join(repo, "README.md"), "hello\n");
    await git(repo, ["add", "."]);
    await git(repo, ["commit", "-q", "-m", "init"]);
  });

  afterEach(async () => {
    for (const key of ISOLATED_ENV_KEYS) {
      const value = savedEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(base, { recursive: true, force: true });
  });

  describe("hookBlock", () => {
    it("embeds markers, fingerprint and the null-oid guard", () => {
      const block = hookBlock("abcdef123456", null);
      expect(block).toContain(HOOK_START);
      expect(block).toContain(`${HOOK_START} fingerprint: abcdef123456`);
      expect(block).toContain(HOOK_END);
      expect(block).toContain("^0+$");
      expect(block).toContain('"$3" = "1"');
      expect(block).toContain("worktree bootstrap --source worktree-create");
      expect(block).toContain("command -v superskill-cli");
      expect(block.startsWith("#!")).toBe(false);
    });

    it("embeds an explicit CLI path with a command -v fallback", () => {
      const block = hookBlock("abcdef123456", "/opt/superskill/dist/cli.js");
      expect(block).toContain("/opt/superskill/dist/cli.js");
      expect(block).toContain("command -v superskill-cli");
    });

    it("treats a blank or whitespace CLI path as absent", () => {
      const block = hookBlock("abcdef123456", "   ");
      expect(block).toContain("command -v superskill-cli");
      expect(block).not.toContain("   ");
    });

    it("exits 0 and backgrounds a discovered CLI on a branch checkout", async () => {
      const bin = join(base, "bin");
      await mkdir(bin, { recursive: true });
      const cli = join(bin, "superskill-cli");
      const called = join(bin, "called.txt");
      await writeFile(cli, `#!/bin/sh\nprintf '%s' "$*" > "${called}"\nexit 1\n`);
      await chmod(cli, 0o755);
      await installPostCheckoutHook(repo);
      const hook = await postCheckoutPath(repo);

      await execFileAsync("sh", [hook, "0".repeat(40), "1".repeat(40), "1"], {
        cwd: repo,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ""}` },
      });
      expect(await waitForFile(called)).toBe(true);
      expect(await readFile(called, "utf-8")).toBe("worktree bootstrap --source worktree-create");
    });

    it("is valid shell and falls back to a PATH CLI when the embedded path is missing", async () => {
      const bin = join(base, "fallback-bin");
      await mkdir(bin, { recursive: true });
      const cli = join(bin, "superskill-cli");
      const called = join(bin, "called.txt");
      await writeFile(cli, `#!/bin/sh\nprintf ok > "${called}"\n`);
      await chmod(cli, 0o755);

      const block = hookBlock("abcdef123456", join(base, "gone cli", "superskill cli.js"));
      const file = join(base, "probe.sh");
      await writeFile(file, `#!/bin/sh\n${block}\n`, { mode: 0o755 });
      await execFileAsync("sh", ["-n", file]);
      await execFileAsync("sh", [file, "0".repeat(40), "1".repeat(40), "1"], {
        cwd: repo,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ""}` },
      });
      expect(await waitForFile(called)).toBe(true);
    });
  });

  describe("detectHookManager", () => {
    it("reports none with the default post-checkout path for a fresh repo", async () => {
      const info = await detectHookManager(repo);
      expect(info.kind).toBe("none");
      expect(info.hooksPath).toBeNull();
      expect(info.hookFile).toBe(await postCheckoutPath(repo));
      expect((await postCheckoutPath(repo)).endsWith(join("hooks", "post-checkout"))).toBe(true);
    });

    it("detects husky when core.hooksPath contains .husky", async () => {
      await git(repo, ["config", "core.hooksPath", ".husky/_"]);
      await mkdir(join(repo, ".husky"), { recursive: true });

      const info = await detectHookManager(repo);
      expect(info.kind).toBe("husky");
      expect(info.hooksPath).toBe(".husky/_");
      expect(info.hookFile.endsWith(join(".husky", "post-checkout"))).toBe(true);
    });

    it("detects block for a custom hooksPath", async () => {
      const hooksDir = join(base, "githooks");
      await mkdir(hooksDir, { recursive: true });
      await git(repo, ["config", "core.hooksPath", hooksDir]);

      const info = await detectHookManager(repo);
      expect(info.kind).toBe("block");
      expect(info.hookFile).toBe(join(hooksDir, "post-checkout"));
    });

    it("detects precommit when .pre-commit-config.yaml exists", async () => {
      await writeFile(join(repo, ".pre-commit-config.yaml"), "repos: []\n");
      const info = await detectHookManager(repo);
      expect(info.kind).toBe("precommit");
    });

    it("detects lefthook only when the hook file mentions LEFTHOOK", async () => {
      await writeFile(join(repo, "lefthook.yml"), "post-checkout:\n  commands: {}\n");
      expect((await detectHookManager(repo)).kind).not.toBe("lefthook");

      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      await writeFile(hook, "#!/bin/sh\nLEFTHOOK=1 lefthook run post-checkout\n", { mode: 0o755 });

      const info = await detectHookManager(repo);
      expect(info.kind).toBe("lefthook");
      expect(info.hookFile.endsWith(".lefthook-local.yml")).toBe(true);
    });

    it("falls back to .git/hooks outside a repository", async () => {
      const outside = join(base, "not-a-repo");
      await mkdir(outside);

      expect(await postCheckoutPath(outside)).toBe(join(outside, ".git", "hooks", "post-checkout"));
      const info = await detectHookManager(outside);
      expect(info.kind).toBe("none");
      expect(info.hooksPath).toBeNull();
      expect(info.hookFile).toBe(join(outside, ".git", "hooks", "post-checkout"));
    });
  });

  describe("installPostCheckoutHook", () => {
    it("creates an executable hook with markers in a fresh repo and is idempotent", async () => {
      const first = await installPostCheckoutHook(repo);
      expect(first.kind).toBe("block");
      expect(first.changed).toBe(true);
      expect(first.backupPath).toBeNull();

      const hook = await postCheckoutPath(repo);
      expect(hook).toBe(first.hookFile);
      const content = await readFile(hook, "utf-8");
      expect(content.startsWith("#!/bin/sh\n")).toBe(true);
      expect(content).toContain(HOOK_START);
      expect(content).toContain(HOOK_END);
      expect(content).toContain("^0+$");
      expect((await stat(hook)).mode & 0o111).not.toBe(0);
      expect(await isHookInstalled(repo)).toBe(true);

      const state = await readHookState(repo);
      expect(state?.kind).toBe("block");
      expect(state?.fingerprint).toBe(first.fingerprint);

      const second = await installPostCheckoutHook(repo);
      expect(second.changed).toBe(false);
      expect(second.fingerprint).toBe(first.fingerprint);
      expect(await readFile(hook, "utf-8")).toBe(content);
    });

    it("installs into a custom empty hooks dir", async () => {
      const hooksDir = join(base, "empty-hooks");
      await mkdir(hooksDir);
      await git(repo, ["config", "core.hooksPath", hooksDir]);

      const result = await installPostCheckoutHook(repo);
      expect(result.changed).toBe(true);
      expect(result.kind).toBe("block");
      const hook = join(hooksDir, "post-checkout");
      expect(result.hookFile).toBe(hook);
      const content = await readFile(hook, "utf-8");
      expect(content).toContain(HOOK_START);
      expect((await stat(hook)).mode & 0o111).not.toBe(0);
    });

    it("appends to an existing user hook, preserving it byte-for-byte and backing it up", async () => {
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      const original = "#!/bin/sh\necho user-hook\n";
      await writeFile(hook, original, { mode: 0o755 });
      await chmod(hook, 0o755);

      const result = await installPostCheckoutHook(repo);
      expect(result.changed).toBe(true);
      expect(result.backupPath).not.toBeNull();

      const content = await readFile(hook, "utf-8");
      expect(content.startsWith(original)).toBe(true);
      expect(content.indexOf(HOOK_START)).toBeGreaterThan(original.length - 1);
      expect(await readFile(result.backupPath as string, "utf-8")).toBe(original);
      expect((await stat(hook)).mode & 0o777).toBe(0o755);
      expect((await readHookState(repo))?.backupPath).toBe(result.backupPath);
    });

    it("preserves non-UTF-8 bytes outside the block across install and uninstall", async () => {
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      const original = Buffer.concat([
        Buffer.from("#!/bin/sh\necho "),
        Buffer.from([0xff, 0xfe]),
        Buffer.from("\n"),
      ]);
      await writeFile(hook, original, { mode: 0o755 });

      const install = await installPostCheckoutHook(repo);
      expect(install.backupPath).not.toBeNull();
      expect(await readFile(install.backupPath as string)).toEqual(original);
      const installed = await readFile(hook);
      expect(installed.subarray(0, original.length).equals(original)).toBe(true);

      const uninstall = await uninstallPostCheckoutHook(repo);
      expect(uninstall.removed).toBe(true);
      expect(await readFile(hook)).toEqual(original);
    });

    it("preserves multi-byte UTF-8 before the block across install and uninstall", async () => {
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      const original = Buffer.from("#!/bin/sh\n# café ☕ note\n", "utf-8");
      await writeFile(hook, original, { mode: 0o755 });

      await installPostCheckoutHook(repo);
      await uninstallPostCheckoutHook(repo);
      expect(await readFile(hook)).toEqual(original);
    });

    it("turns an empty existing hook into an executable shebang hook", async () => {
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      await writeFile(hook, "", { mode: 0o644 });
      await chmod(hook, 0o644);

      const result = await installPostCheckoutHook(repo);
      expect(result.changed).toBe(true);
      expect(result.backupPath).toBeNull();
      const content = await readFile(hook, "utf-8");
      expect(content.startsWith("#!/bin/sh\n")).toBe(true);
      expect(content).toContain(HOOK_START);
      expect((await stat(hook)).mode & 0o777).toBe(0o755);
    });

    it("turns a whitespace-only hook into an executable shebang hook", async () => {
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      await writeFile(hook, "\n   \n", { mode: 0o644 });
      await chmod(hook, 0o644);

      const result = await installPostCheckoutHook(repo);
      expect(result.changed).toBe(true);
      const content = await readFile(hook, "utf-8");
      expect(content.startsWith("#!/bin/sh\n")).toBe(true);
      expect(content).toContain(HOOK_START);
      expect((await stat(hook)).mode & 0o777).toBe(0o755);
    });

    it("sets mode 0755 when appending to a non-executable hook and notes it", async () => {
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      const original = "#!/bin/sh\necho user\n";
      await writeFile(hook, original, { mode: 0o644 });
      await chmod(hook, 0o644);

      const result = await installPostCheckoutHook(repo);
      expect(result.changed).toBe(true);
      expect(result.notes.join(" ")).toContain("not executable");
      expect(result.notes.join(" ")).toContain("0755");
      expect((await stat(hook)).mode & 0o777).toBe(0o755);
      expect((await stat(result.backupPath as string)).mode & 0o777).toBe(0o644);
      expect(await readFile(result.backupPath as string, "utf-8")).toBe(original);
    });

    it("inserts a newline before the block when the user hook lacks a trailing one", async () => {
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      const original = "#!/bin/sh\necho no-newline";
      await writeFile(hook, original, { mode: 0o755 });
      await chmod(hook, 0o755);

      const result = await installPostCheckoutHook(repo);
      expect(result.changed).toBe(true);
      const content = await readFile(hook, "utf-8");
      expect(content.startsWith(`${original}\n${HOOK_START}`)).toBe(true);
    });

    it("keeps the first backup and does not clobber it", async () => {
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      await writeFile(hook, "#!/bin/sh\necho first\n", { mode: 0o755 });

      const first = await installPostCheckoutHook(repo);
      expect(first.backupPath).not.toBeNull();
      await writeFile(first.backupPath as string, "sentinel\n");

      await writeFile(hook, "#!/bin/sh\necho second\n", { mode: 0o755 });
      const second = await installPostCheckoutHook(repo);
      expect(second.backupPath).toBe(first.backupPath);
      expect(await readFile(first.backupPath as string, "utf-8")).toBe("sentinel\n");
    });

    it("does not write anything on dry-run", async () => {
      const result = await installPostCheckoutHook(repo, { dryRun: true, cliPath: "/tmp/cli.js" });
      expect(result.changed).toBe(true);
      expect(result.kind).toBe("block");
      expect(await exists(await postCheckoutPath(repo))).toBe(false);
      expect(await readHookState(repo)).toBeNull();
    });

    it("creates .husky/post-checkout for husky repos", async () => {
      await git(repo, ["config", "core.hooksPath", ".husky/_"]);
      await mkdir(join(repo, ".husky"), { recursive: true });

      const result = await installPostCheckoutHook(repo);
      expect(result.kind).toBe("husky");
      expect(result.changed).toBe(true);
      const content = await readFile(result.hookFile, "utf-8");
      expect(content.startsWith("#!/bin/sh\n")).toBe(true);
      expect(content).toContain(HOOK_START);
      expect(await isHookInstalled(repo)).toBe(true);
    });

    it("skips pre-commit repos with an explicit note", async () => {
      await writeFile(join(repo, ".pre-commit-config.yaml"), "repos: []\n");
      const result = await installPostCheckoutHook(repo);
      expect(result.kind).toBe("precommit");
      expect(result.changed).toBe(false);
      expect(result.notes.join(" ")).toContain("manual pre-commit integration required");
      expect(await exists(await postCheckoutPath(repo))).toBe(false);
    });

    it("skips an existing .lefthook-local.yml with a note", async () => {
      await writeFile(join(repo, "lefthook.yml"), "post-checkout:\n  commands: {}\n");
      await writeFile(join(repo, ".lefthook-local.yml"), "# user local config\n");
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      await writeFile(hook, "#!/bin/sh\nLEFTHOOK=1 lefthook run post-checkout\n", { mode: 0o755 });

      const result = await installPostCheckoutHook(repo);
      expect(result.kind).toBe("lefthook");
      expect(result.changed).toBe(false);
      expect(result.notes.join(" ")).toContain("left untouched");
      expect(await readFile(join(repo, ".lefthook-local.yml"), "utf-8")).toBe("# user local config\n");
    });

    it("creates .lefthook-local.yml when none exists", async () => {
      await writeFile(join(repo, "lefthook.yml"), "post-checkout:\n  commands: {}\n");
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      await writeFile(hook, "#!/bin/sh\nLEFTHOOK=1 lefthook run post-checkout\n", { mode: 0o755 });

      const result = await installPostCheckoutHook(repo);
      expect(result.kind).toBe("lefthook");
      expect(result.changed).toBe(true);
      const content = await readFile(result.hookFile, "utf-8");
      expect(content).toContain(HOOK_START);
      expect(content).toContain("post-checkout:");
      expect(content).toContain("worktree bootstrap --source worktree-create");
    });

    it("embeds an explicit CLI path in a lefthook command", async () => {
      await writeFile(join(repo, "lefthook.yml"), "post-checkout:\n  commands: {}\n");
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      await writeFile(hook, "#!/bin/sh\nLEFTHOOK=1 lefthook run post-checkout\n", { mode: 0o755 });

      const result = await installPostCheckoutHook(repo, { cliPath: "/opt/superskill/cli.js" });

      expect(result.kind).toBe("lefthook");
      expect(result.changed).toBe(true);
      const content = await readFile(result.hookFile, "utf-8");
      expect(content).toContain("/opt/superskill/cli.js");
      expect(content).toContain("worktree bootstrap --source worktree-create");
    });
  });

  describe("uninstallPostCheckoutHook", () => {
    it("removes a hook file that superskill created", async () => {
      await installPostCheckoutHook(repo);
      const hook = await postCheckoutPath(repo);
      expect(await exists(hook)).toBe(true);

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(true);
      expect(result.restored).toBe(false);
      expect(await exists(hook)).toBe(false);
      expect(await readHookState(repo)).toBeNull();
    });

    it("is idempotent when no hook is installed", async () => {
      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(false);
      expect(result.notes.length).toBeGreaterThan(0);
    });

    it("strips the block from a user hook and keeps the original content", async () => {
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      const original = "#!/bin/sh\necho user-hook\n";
      await writeFile(hook, original, { mode: 0o755 });
      await installPostCheckoutHook(repo);

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(true);
      expect(result.restored).toBe(false);
      const content = await readFile(hook, "utf-8");
      expect(content).toBe(original);
    });

    it("restores the backup when the pre-existing hook was shebang-only", async () => {
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      const original = "#!/bin/sh\n";
      await writeFile(hook, original, { mode: 0o755 });
      await installPostCheckoutHook(repo);

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(true);
      expect(result.restored).toBe(true);
      expect(await readFile(hook, "utf-8")).toBe(original);
    });

    it("removes .husky/post-checkout for husky repos", async () => {
      await git(repo, ["config", "core.hooksPath", ".husky/_"]);
      await mkdir(join(repo, ".husky"), { recursive: true });
      const install = await installPostCheckoutHook(repo);

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(true);
      expect(await exists(install.hookFile)).toBe(false);
    });

    it("removes our .lefthook-local.yml but leaves unrelated files alone", async () => {
      await writeFile(join(repo, "lefthook.yml"), "post-checkout:\n  commands: {}\n");
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      await writeFile(hook, "#!/bin/sh\nLEFTHOOK=1 lefthook run post-checkout\n", { mode: 0o755 });
      const install = await installPostCheckoutHook(repo);
      expect(install.changed).toBe(true);

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(true);
      expect(await exists(install.hookFile)).toBe(false);
    });
  });

  describe("unterminated superskill block", () => {
    async function seedUnterminated(): Promise<{ hook: string; content: string }> {
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      const content = `#!/bin/sh\n${HOOK_START} fingerprint: deadbeef\n# user edited tail without the end marker\n`;
      await writeFile(hook, content, { mode: 0o755 });
      return { hook, content };
    }

    it("install refuses to modify the hook and keeps the file", async () => {
      const { hook, content } = await seedUnterminated();

      const result = await installPostCheckoutHook(repo);
      expect(result.changed).toBe(false);
      expect(result.notes.join(" ")).toContain("unterminated superskill block; manual fix required");
      expect(await readFile(hook, "utf-8")).toBe(content);
      expect(await readHookState(repo)).toBeNull();
    });

    it("uninstall refuses to modify the hook and keeps the file", async () => {
      const { hook, content } = await seedUnterminated();

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(false);
      expect(result.restored).toBe(false);
      expect(result.notes.join(" ")).toContain("unterminated superskill block; manual fix required");
      expect(await readFile(hook, "utf-8")).toBe(content);
    });
  });

  describe("uninstall without usable hook state", () => {
    it("strips the block but keeps the hook file when hook.state was deleted", async () => {
      await installPostCheckoutHook(repo);
      const hook = await postCheckoutPath(repo);
      await rm(join(await repoStateDir(repo), "hook.state"), { force: true });

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(true);
      expect(result.restored).toBe(false);
      expect(await exists(hook)).toBe(true);
      const content = await readFile(hook, "utf-8");
      expect(content).not.toContain(HOOK_START);
      expect(content).not.toContain(HOOK_END);
    });

    it("strips the block but keeps the hook file when hook.state is corrupt", async () => {
      await installPostCheckoutHook(repo);
      const hook = await postCheckoutPath(repo);
      await writeFile(join(await repoStateDir(repo), "hook.state"), "{ not json");

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(true);
      expect(await exists(hook)).toBe(true);
      const content = await readFile(hook, "utf-8");
      expect(content).not.toContain(HOOK_START);
    });

    it("restores the deterministic backup when hook.state was corrupted", async () => {
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      const original = "#!/bin/sh\n";
      await writeFile(hook, original, { mode: 0o755 });
      await installPostCheckoutHook(repo);
      await rm(join(await repoStateDir(repo), "hook.state"), { force: true });

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.restored).toBe(true);
      expect(await readFile(hook, "utf-8")).toBe(original);
    });
  });

  describe("lefthook uninstall variants", () => {
    async function installLefthook(): Promise<string> {
      await writeFile(join(repo, "lefthook.yml"), "post-checkout:\n  commands: {}\n");
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      await writeFile(hook, "#!/bin/sh\nLEFTHOOK=1 lefthook run post-checkout\n", { mode: 0o755 });
      const install = await installPostCheckoutHook(repo);
      expect(install.kind).toBe("lefthook");
      return install.hookFile;
    }

    it("removes a superskill-created .lefthook-local.yml when detection changed", async () => {
      const hookFile = await installLefthook();
      await rm(join(repo, "lefthook.yml"));
      const hook = await postCheckoutPath(repo);
      await writeFile(hook, "#!/bin/sh\necho plain\n", { mode: 0o755 });

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(true);
      expect(result.restored).toBe(false);
      expect(await exists(hookFile)).toBe(false);
      expect(result.notes.join(" ")).toContain("removed .lefthook-local.yml created by superskill");
    });

    it("reports a lefthook state whose local file lost our block", async () => {
      const hookFile = await installLefthook();
      await writeFile(hookFile, "# user local config\n");
      await rm(join(repo, "lefthook.yml"));
      const hook = await postCheckoutPath(repo);
      await writeFile(hook, "#!/bin/sh\necho plain\n", { mode: 0o755 });

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(false);
      expect(result.notes.join(" ")).toContain("no superskill block found in .lefthook-local.yml");
      expect(await readFile(hookFile, "utf-8")).toBe("# user local config\n");
    });

    it("refuses to touch an unterminated lefthook block", async () => {
      const hookFile = await installLefthook();
      const unterminated = `${HOOK_START} fingerprint: deadbeef\n# no end marker\n`;
      await writeFile(hookFile, unterminated);

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(false);
      expect(result.notes.join(" ")).toContain("unterminated superskill block");
      expect(await readFile(hookFile, "utf-8")).toBe(unterminated);
    });

    it("preserves other lefthook-local content when stripping our block", async () => {
      const hookFile = await installLefthook();
      const user = "# user local config\n";
      await writeFile(hookFile, user + (await readFile(hookFile, "utf-8")));

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(true);
      expect(result.restored).toBe(false);
      expect(await readFile(hookFile, "utf-8")).toBe(user);
      expect(result.notes.join(" ")).toContain("removed superskill block from .lefthook-local.yml");
    });

    it("restores a recorded lefthook backup on uninstall", async () => {
      const hookFile = await installLefthook();
      const backup = join(base, "lefthook-backup.yml");
      await writeFile(backup, "# prior local config\n");
      const state = await readHookState(repo);
      expect(state?.kind).toBe("lefthook");
      await writeHookState(repo, { ...(state as NonNullable<typeof state>), backupPath: backup });

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(true);
      expect(result.restored).toBe(true);
      expect(await readFile(hookFile, "utf-8")).toBe("# prior local config\n");
      expect(result.notes.join(" ")).toContain("restored backup of pre-existing .lefthook-local.yml");
    });
  });

  describe("hook edge cases", () => {
    it("reports precommit and unmarked lefthook repos as not installed", async () => {
      await writeFile(join(repo, ".pre-commit-config.yaml"), "repos: []\n");
      expect(await isHookInstalled(repo)).toBe(false);
      await rm(join(repo, ".pre-commit-config.yaml"));

      await writeFile(join(repo, "lefthook.yml"), "post-checkout:\n  commands: {}\n");
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      await writeFile(hook, "#!/bin/sh\nLEFTHOOK=1 lefthook run post-checkout\n", { mode: 0o755 });
      expect(await isHookInstalled(repo)).toBe(false);
    });

    it("reports a hook file without our block as not removed", async () => {
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      await writeFile(hook, "#!/bin/sh\necho user\n", { mode: 0o755 });

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(false);
      expect(result.restored).toBe(false);
      expect(result.notes.join(" ")).toContain("no superskill hook block found");
      expect(await readFile(hook, "utf-8")).toContain("echo user");
    });

    it("keeps a stripped hook when the recorded backup cannot be restored", async () => {
      const hook = await postCheckoutPath(repo);
      await mkdir(dirname(hook), { recursive: true });
      await writeFile(hook, "#!/bin/sh\n", { mode: 0o755 });
      const install = await installPostCheckoutHook(repo);
      const backupPath = install.backupPath as string;
      await rm(backupPath, { force: true });
      await mkdir(backupPath);

      const result = await uninstallPostCheckoutHook(repo);
      expect(result.removed).toBe(true);
      expect(result.restored).toBe(false);
      expect(result.notes.join(" ")).toContain("backup could not be restored");
      const content = await readFile(hook, "utf-8");
      expect(content).not.toContain(HOOK_START);
      expect(await exists(backupPath)).toBe(true);
    });
  });
});
