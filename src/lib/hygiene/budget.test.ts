import { describe, expect, it } from "vitest";
import { mapBounded } from "./budget.js";

describe("hygiene probe bounds", () => {
  it("caps candidates before probing and bounds concurrency", async () => {
    let active = 0;
    let peak = 0;
    let calls = 0;
    const result = await mapBounded(Array.from({ length: 1000 }, (_, index) => index), async (value) => {
      calls += 1;
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
      return value;
    });
    expect(calls).toBe(200);
    expect(peak).toBeLessThanOrEqual(4);
    expect(result).toHaveLength(200);
  });

  it("does not schedule expired work", async () => {
    let calls = 0;
    expect(await mapBounded([1, 2], async () => ++calls, { deadline: 0 })).toEqual([]);
    expect(calls).toBe(0);
  });
});
