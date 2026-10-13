// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { homedir } from "node:os";
import { join } from "node:path";
import { obsidianAppInstalled, obsidianDeepLink } from "./obsidian.js";

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
