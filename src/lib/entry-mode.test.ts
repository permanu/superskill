// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { resolveEntryMode } from "./entry-mode.js";

describe("resolveEntryMode", () => {
  it("routes commands to the CLI", () => {
    expect(resolveEntryMode({ args: ["doctor"], stdinIsTTY: false })).toBe("cli");
    expect(resolveEntryMode({ args: ["--version"], stdinIsTTY: false })).toBe("cli");
  });

  it("starts the MCP server when spawned without arguments over pipes", () => {
    expect(resolveEntryMode({ args: [], stdinIsTTY: false })).toBe("mcp");
  });

  it("shows the CLI when run bare from a terminal", () => {
    expect(resolveEntryMode({ args: [], stdinIsTTY: true })).toBe("cli");
  });

  it("honors the force-MCP override", () => {
    expect(resolveEntryMode({ args: [], stdinIsTTY: true, forceMcp: true })).toBe("mcp");
    expect(resolveEntryMode({ args: ["doctor"], stdinIsTTY: true, forceMcp: true })).toBe("mcp");
  });
});
