// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { getSkillAwarenessBlock } from "./marketplace.js";

describe("getSkillAwarenessBlock", () => {
  it("uses runtime router branding", () => {
    const block = getSkillAwarenessBlock();
    expect(block).toContain("Write, review, test, or debug");
    expect(block).toContain("runtime skill router");
    expect(block).not.toContain("- **brainstorming** —");
    expect(block).not.toContain("- **tdd** —");
  });

  it("includes dynamic skill count", () => {
    const block = getSkillAwarenessBlock();
    expect(block).toMatch(/\d+.*skills/);
  });
});
