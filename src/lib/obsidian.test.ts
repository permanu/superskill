// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  });
});
