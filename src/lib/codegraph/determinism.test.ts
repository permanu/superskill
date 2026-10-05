// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { fixturePath } from "./__fixtures__/paths.js";
import { scanRepo } from "./scan.js";
import { CodeGraphStore } from "./store.js";

describe("scan determinism", () => {
  it("produces deep-equal graphs for repeated scans of the same fixture", async () => {
    const first = await scanRepo(fixturePath("typescript"));
    const second = await scanRepo(fixturePath("typescript"));
    expect(second.graph).toEqual(first.graph);
    expect(JSON.stringify(second.graph)).toBe(JSON.stringify(first.graph));
    expect(second.stats).toEqual(first.stats);
  });

  it("serializes the same store to identical JSON twice", async () => {
    const { graph } = await scanRepo(fixturePath("python"));
    const a = new CodeGraphStore(graph).toJSON();
    const b = new CodeGraphStore(graph).toJSON();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
