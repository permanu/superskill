// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { obsidianAppInstalled, obsidianDeepLink, scopeGraphFilter } from "./obsidian.js";

describe("obsidianAppInstalled", () => {
  it("treats non-macOS platforms as launchable", () => {
    expect(obsidianAppInstalled({ platform: "linux", exists: () => false })).toBe(true);
    expect(obsidianAppInstalled({ platform: "win32", exists: () => false })).toBe(true);
  });

  it("detects a missing macOS app", () => {
    expect(obsidianAppInstalled({ platform: "darwin", exists: () => false })).toBe(false);
  });

  it("accepts the system Applications location", () => {
    expect(
      obsidianAppInstalled({ platform: "darwin", exists: (p) => p === "/Applications/Obsidian.app" }),
    ).toBe(true);
  });

  it("accepts a user Applications location", () => {
    const userApp = join(homedir(), "Applications", "Obsidian.app");
    expect(obsidianAppInstalled({ platform: "darwin", exists: (p) => p === userApp })).toBe(true);
  });
});

describe("obsidianDeepLink", () => {
  it("encodes the vault name and the note path", () => {
    expect(obsidianDeepLink("my vault", "projects/a b/context.md")).toBe(
      "obsidian://open?vault=my%20vault&file=projects%2Fa%20b%2Fcontext.md",
    );
  });

  it("omits the file parameter when there is no target", () => {
    expect(obsidianDeepLink("ai", null)).toBe("obsidian://open?vault=ai");
  });
});

describe("scopeGraphFilter", () => {
  let scratch: string;
  let vaultRoot: string;

  beforeEach(async () => {
    scratch = await mkdtemp(join(tmpdir(), "obsidian-scope-"));
    vaultRoot = join(scratch, "vault");
    await mkdir(vaultRoot, { recursive: true });
  });

  afterEach(async () => {
    await rm(scratch, { recursive: true, force: true });
  });

  it("reports when the vault has no Obsidian config yet", async () => {
    await expect(scopeGraphFilter(vaultRoot, "superskill")).resolves.toEqual({
      ok: false,
      reason: "vault has not been opened in Obsidian yet (no .obsidian/graph.json)",
    });
    expect(existsSync(join(vaultRoot, ".obsidian"))).toBe(false);
  });

  it("leaves malformed JSON untouched", async () => {
    const graphPath = join(vaultRoot, ".obsidian", "graph.json");
    await mkdir(join(vaultRoot, ".obsidian"), { recursive: true });
    await writeFile(graphPath, "{ not json");
    await expect(scopeGraphFilter(vaultRoot, "superskill")).resolves.toEqual({
      ok: false,
      reason: "graph.json is not valid JSON; left unchanged",
    });
    await expect(readFile(graphPath, "utf8")).resolves.toBe("{ not json");
  });

  it("sets the search filter and preserves every other key", async () => {
    const graphPath = join(vaultRoot, ".obsidian", "graph.json");
    await mkdir(join(vaultRoot, ".obsidian"), { recursive: true });
    await writeFile(graphPath, JSON.stringify({ repelStrength: 10, showTags: false }));
    await expect(scopeGraphFilter(vaultRoot, "superskill")).resolves.toEqual({ ok: true });
    const raw = await readFile(graphPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.search).toBe("path:projects/superskill");
    expect(parsed.repelStrength).toBe(10);
    expect(parsed.showTags).toBe(false);
    expect(raw).toBe(`${JSON.stringify(parsed, null, 2)}\n`);
    expect((await stat(graphPath)).mode & 0o777).toBe(0o600);
  });

  it("enforces mode 0600 even when the graph filter and serialized settings are unchanged", async () => {
    const graphPath = join(vaultRoot, ".obsidian", "graph.json");
    const original = `${JSON.stringify({ search: "path:projects/superskill", showTags: false }, null, 2)}\n`;
    await mkdir(join(vaultRoot, ".obsidian"));
    await writeFile(graphPath, original);
    await chmod(graphPath, 0o644);
    expect(await scopeGraphFilter(vaultRoot, "superskill")).toEqual({ ok: true });
    expect(await readFile(graphPath, "utf8")).toBe(original);
    expect((await stat(graphPath)).mode & 0o777).toBe(0o600);
  });

  it.each(["directory", "file"])("rejects an escaping %s symlink without changing the target", async (kind) => {
    const outside = join(scratch, "outside");
    await mkdir(outside);
    const original = JSON.stringify({ search: "my filter", user: { colors: [1, 2] } });
    const target = join(outside, "graph.json");
    await writeFile(target, original);
    if (kind === "directory") await symlink(outside, join(vaultRoot, ".obsidian"));
    else {
      await mkdir(join(vaultRoot, ".obsidian"));
      await symlink(target, join(vaultRoot, ".obsidian", "graph.json"));
    }
    const result = await scopeGraphFilter(vaultRoot, "superskill");
    expect(result.ok).toBe(false);
    expect(await readFile(target, "utf8")).toBe(original);
  });

  it("rejects an unsafe project slug without changing settings", async () => {
    const graphPath = join(vaultRoot, ".obsidian", "graph.json");
    await mkdir(join(vaultRoot, ".obsidian"));
    await writeFile(graphPath, '{"search":"mine"}');
    expect((await scopeGraphFilter(vaultRoot, 'p OR path:projects/other')).ok).toBe(false);
    expect(await readFile(graphPath, "utf8")).toBe('{"search":"mine"}');
  });

  it("does not follow graph.json symlinks into other vault files", async () => {
    const target = join(vaultRoot, "user-settings.json");
    await writeFile(target, '{"search":"mine"}');
    await mkdir(join(vaultRoot, ".obsidian"));
    await symlink(target, join(vaultRoot, ".obsidian", "graph.json"));
    expect((await scopeGraphFilter(vaultRoot, "superskill")).ok).toBe(false);
    expect(await readFile(target, "utf8")).toBe('{"search":"mine"}');
  });
});
