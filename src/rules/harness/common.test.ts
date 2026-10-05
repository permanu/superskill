// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import type { HarnessResult } from "../types.js";
import { fallbackResult } from "./common.js";

const ok = (compiler: string): HarnessResult => ({ ok: true, skipped: false, compiler, output: "" });
const fail = (compiler: string): HarnessResult => ({ ok: false, skipped: false, compiler, output: "boom" });
const skip = (compiler: string): HarnessResult => ({ ok: false, skipped: true, compiler: "skipped", output: "not available" });

describe("fallbackResult", () => {
  it("returns the primary result and never runs the secondary when the primary succeeds", async () => {
    const secondary = vi.fn(async () => ok("gcc"));
    const result = await fallbackResult(async () => ok("clang"), secondary);
    expect(result.compiler).toBe("clang");
    expect(secondary).not.toHaveBeenCalled();
  });

  it("uses the secondary when the primary fails", async () => {
    const result = await fallbackResult(async () => fail("clang"), async () => ok("gcc"));
    expect(result.compiler).toBe("gcc");
  });

  it("reports the primary failure when both fail", async () => {
    const result = await fallbackResult(async () => fail("clang"), async () => fail("gcc"));
    expect(result.compiler).toBe("clang");
    expect(result.output).toBe("boom");
  });

  it("uses the secondary when the primary is unavailable", async () => {
    const result = await fallbackResult(async () => skip("clang"), async () => ok("gcc"));
    expect(result.compiler).toBe("gcc");
  });

  it("reports the secondary when the primary is unavailable and the secondary fails", async () => {
    const result = await fallbackResult(async () => skip("clang"), async () => fail("gcc"));
    expect(result.compiler).toBe("gcc");
  });
});
