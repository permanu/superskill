// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { CommandContext } from "../../core/types.js";
import { worktreeEnvCommand, renderWorktreeEnv, type WorktreeEnvResult } from "../../commands/worktree/env.js";
import { mergeEnvVars, renderEnvText, resolveWorktreeEnv, shellEscape, type TaggedEnvVar } from "./env.js";
import { cacheNamespace } from "./paths.js";

const execFileAsync = promisify(execFile);

const GIT_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, env: GIT_ENV, timeout: 15000 });
  return stdout;
}

function varTag(provider: string, name: string, value: string, mode?: TaggedEnvVar["mode"]): TaggedEnvVar {
  return { provider, name, value, mode };
}

describe("resolveWorktreeEnv", () => {
  let base: string;
  let repo: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-env-"));
    repo = join(base, "repo");
    await mkdir(repo);
    await git(repo, ["init", "-q", "-b", "main"]);
    await writeFile(join(repo, "README.md"), "hello\n");
    await git(repo, ["add", "."]);
    await git(repo, ["commit", "-q", "-m", "init"]);
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  it("returns no vars, providers, or notes for a repo with no stack markers", async () => {
    const result = await resolveWorktreeEnv(repo);

    expect(result.repoId).toMatch(/^[0-9a-f]{16}$/);
    expect(result.worktreeRoot).toBe(repo);
    expect(result.repoRoot.endsWith("repo")).toBe(true);
    expect(result.stacks).toEqual([]);
    expect(result.providers).toEqual([]);
    expect(result.vars).toEqual([]);
    expect(result.notes).toEqual([]);
  });

  it("resolves namespaced go vars and appends GOFLAGS", async () => {
    await writeFile(join(repo, "go.mod"), "module example.com/test\n");
    const previous = process.env.GOFLAGS;
    delete process.env.GOFLAGS;
    try {
      const result = await resolveWorktreeEnv(repo);

      expect(result.providers).toEqual(["go"]);
      expect(result.stacks).toContain("go");

      const namespace = cacheNamespace(result.repoId);
      const byName = new Map(result.vars.map((v) => [v.name, v]));
      expect(byName.get("GOCACHE")).toEqual({
        name: "GOCACHE",
        value: join(namespace, "go-build"),
        mode: "set",
        provider: "go",
      });
      expect(byName.get("GOMODCACHE")).toEqual({
        name: "GOMODCACHE",
        value: join(namespace, "go-mod"),
        mode: "set",
        provider: "go",
      });
      expect(byName.get("GOFLAGS")).toEqual({
        name: "GOFLAGS",
        value: "-trimpath",
        mode: "append",
        provider: "go",
      });
      expect(byName.has("VIRTUAL_ENV")).toBe(false);
      expect(byName.has("CARGO_TARGET_DIR")).toBe(false);
      expect(result.notes.length).toBeGreaterThan(0);
      expect(result.notes.some((note) => note.includes("GOFLAGS"))).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.GOFLAGS;
      else process.env.GOFLAGS = previous;
    }
  });

  it("merges GOFLAGS with the process env value", async () => {
    await writeFile(join(repo, "go.mod"), "module example.com/test\n");
    const previous = process.env.GOFLAGS;
    process.env.GOFLAGS = "-mod=vendor";
    try {
      const result = await resolveWorktreeEnv(repo);
      const goflags = result.vars.find((v) => v.name === "GOFLAGS");
      expect(goflags?.value).toBe("-mod=vendor -trimpath");
      expect(goflags?.mode).toBe("append");
    } finally {
      if (previous === undefined) delete process.env.GOFLAGS;
      else process.env.GOFLAGS = previous;
    }
  });

  it("filters providers to requested ids", async () => {
    await writeFile(join(repo, "go.mod"), "module example.com/test\n");

    const withoutGo = await resolveWorktreeEnv(repo, { providers: ["node", "python"] });
    expect(withoutGo.providers).toEqual([]);
    expect(withoutGo.vars).toEqual([]);
    expect(withoutGo.notes).toEqual([]);

    const onlyGo = await resolveWorktreeEnv(repo, { providers: ["go"] });
    expect(onlyGo.providers).toEqual(["go"]);
    expect(onlyGo.vars.map((v) => v.name)).toEqual(["GOCACHE", "GOMODCACHE", "GOFLAGS"]);

    const none = await resolveWorktreeEnv(repo, { providers: [] });
    expect(none.providers).toEqual([]);
    expect(none.vars).toEqual([]);
  });
});

describe("mergeEnvVars", () => {
  it("appends to the process env base", () => {
    expect(mergeEnvVars([varTag("a", "X", "two", "append")], { X: "base" })).toEqual([
      { name: "X", value: "base two", mode: "append", provider: "a" },
    ]);
  });

  it("prepends to the process env base", () => {
    expect(mergeEnvVars([varTag("a", "X", "two", "prepend")], { X: "base" })).toEqual([
      { name: "X", value: "two base", mode: "prepend", provider: "a" },
    ]);
  });

  it("path-prepends with the POSIX separator", () => {
    expect(mergeEnvVars([varTag("a", "PATH", "/next", "path-prepend")], { PATH: "/base" }, "linux")).toEqual([
      { name: "PATH", value: "/next:/base", mode: "path-prepend", provider: "a" },
    ]);
  });

  it("path-prepends with the Windows separator", () => {
    expect(
      mergeEnvVars([varTag("a", "Path", "C:\\next", "path-prepend")], { Path: "C:\\base" }, "win32")
    ).toEqual([{ name: "Path", value: "C:\\next;C:\\base", mode: "path-prepend", provider: "a" }]);
  });

  it("applies providers in order and lets a later set replace everything", () => {
    expect(
      mergeEnvVars(
        [varTag("a", "X", "one"), varTag("b", "X", "two", "append"), varTag("c", "X", "final")],
        { X: "base" }
      )
    ).toEqual([{ name: "X", value: "final", mode: "set", provider: "c" }]);
  });

  it("merges sequential appends without a base", () => {
    expect(mergeEnvVars([varTag("a", "X", "one"), varTag("b", "X", "two", "append")], {})).toEqual([
      { name: "X", value: "one two", mode: "append", provider: "b" },
    ]);
  });

  it("keeps first-seen name order and last provider attribution", () => {
    const merged = mergeEnvVars(
      [varTag("a", "B", "1"), varTag("b", "A", "2"), varTag("c", "B", "3", "append")],
      {}
    );
    expect(merged).toEqual([
      { name: "B", value: "1 3", mode: "append", provider: "c" },
      { name: "A", value: "2", mode: "set", provider: "b" },
    ]);
  });
});

describe("shellEscape", () => {
  it("wraps plain values in single quotes", () => {
    expect(shellEscape("plain")).toBe("'plain'");
    expect(shellEscape("hello world")).toBe("'hello world'");
  });

  it("escapes embedded single quotes", () => {
    expect(shellEscape("a'b")).toBe("'a'\\''b'");
  });

  it("renders variables literally", () => {
    expect(shellEscape("$VAR")).toBe("'$VAR'");
  });
});

describe("renderEnvText", () => {
  const vars = [
    { name: "FOO", value: "a'b", mode: "set" as const, provider: "test" },
    { name: "BAR", value: "hello world", mode: "append" as const, provider: "test" },
  ];

  it("emits sh exports by default", () => {
    expect(renderEnvText(vars)).toBe("export FOO='a'\\''b'\nexport BAR='hello world'\n");
  });

  it("emits fish set -gx lines", () => {
    expect(renderEnvText(vars, "fish")).toBe("set -gx FOO 'a'\\''b'\nset -gx BAR 'hello world'\n");
  });

  it("emits powershell assignments with doubled single quotes", () => {
    expect(renderEnvText(vars, "powershell")).toBe("$Env:FOO = 'a''b'\n$Env:BAR = 'hello world'\n");
  });

  it("returns an empty string for an empty var list", () => {
    expect(renderEnvText([])).toBe("");
    expect(renderEnvText([], "fish")).toBe("");
    expect(renderEnvText([], "powershell")).toBe("");
  });

  it("skips values containing newlines instead of emitting broken exports", () => {
    const mixed = [
      ...vars,
      { name: "MULTILINE", value: "first\nsecond", mode: "set" as const, provider: "test" },
      { name: "CARRIAGE", value: "a\rb", mode: "set" as const, provider: "test" },
    ];

    expect(renderEnvText(mixed)).toBe("export FOO='a'\\''b'\nexport BAR='hello world'\n");
    expect(renderEnvText(mixed)).not.toContain("MULTILINE");
    expect(renderEnvText(mixed)).not.toContain("CARRIAGE");
    expect(renderEnvText(mixed, "fish")).toBe("set -gx FOO 'a'\\''b'\nset -gx BAR 'hello world'\n");
    expect(renderEnvText(mixed, "powershell")).toBe("$Env:FOO = 'a''b'\n$Env:BAR = 'hello world'\n");
    expect(
      renderEnvText([{ name: "ONLY", value: "x\ny", mode: "set", provider: "test" }]),
    ).toBe("");
  });
});

describe("renderWorktreeEnv", () => {
  const result: WorktreeEnvResult = {
    worktreeRoot: "/tmp/wt",
    repoRoot: "/tmp/repo",
    repoId: "abc",
    providers: ["go"],
    text: "export GOFLAGS='-trimpath'\n",
    json: { GOFLAGS: "-trimpath" },
    notes: ["note"],
  };

  it("returns shell text by default", () => {
    expect(renderWorktreeEnv(result)).toBe(result.text);
    expect(renderWorktreeEnv(result, { text: true })).toBe(result.text);
  });

  it("returns pretty JSON when text is disabled", () => {
    expect(renderWorktreeEnv(result, { text: false })).toBe(JSON.stringify(result.json, null, 2));
  });
});

describe("worktreeEnvCommand", () => {
  let base: string;
  let repo: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-env-cmd-"));
    repo = join(base, "repo");
    await mkdir(repo);
    await git(repo, ["init", "-q", "-b", "main"]);
    await writeFile(join(repo, "README.md"), "hello\n");
    await git(repo, ["add", "."]);
    await git(repo, ["commit", "-q", "-m", "init"]);
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  it("resolves from cwd and renders the requested shell", async () => {
    await writeFile(join(repo, "go.mod"), "module example.com/test\n");
    const previous = process.env.GOFLAGS;
    delete process.env.GOFLAGS;
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(repo);
    try {
      const result = await worktreeEnvCommand(
        { json: true, shell: "fish", providers: ["go"] },
        {} as CommandContext
      );

      expect(result.worktreeRoot).toBe(repo);
      expect(result.providers).toEqual(["go"]);
      expect(result.text).toContain("set -gx GOCACHE ");
      expect(result.json.GOFLAGS).toBe("-trimpath");
      expect(renderWorktreeEnv(result, { text: false })).toBe(JSON.stringify(result.json, null, 2));
    } finally {
      cwdSpy.mockRestore();
      if (previous === undefined) delete process.env.GOFLAGS;
      else process.env.GOFLAGS = previous;
    }
  });
});
