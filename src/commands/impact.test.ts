// SPDX-License-Identifier: Apache-2.0

import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fixturePath } from "../lib/codegraph/__fixtures__/paths.js";
import { impactCommand } from "./impact.js";

const ROOT = fixturePath("claims", "repo");

describe("impactCommand", () => {
  it("reports definitions, importers, and INFERRED callers for a file target", async () => {
    const result = await impactCommand({ target: "src/beta.ts", root: ROOT });

    expect(result.kind).toBe("file");
    expect(result.node.id).toBe("file:src/beta.ts");
    expect(result.definitions.map((node) => node.name)).toEqual(["helper", "lonely"]);
    expect(result.definitions.every((node) => node.kind !== "module")).toBe(true);

    expect(result.importers.map((entry) => entry.node.id)).toEqual([
      "file:src/alpha.ts",
      "file:src/gamma.ts",
    ]);
    expect(result.importers.every((entry) => entry.edge.kind === "imports")).toBe(true);
    expect(result.importers.every((entry) => entry.edge.confidence === "INFERRED")).toBe(true);

    expect(result.callers.map((entry) => entry.caller?.name)).toEqual(["alpha", "gamma"]);
    expect(result.callers.every((entry) => entry.symbol.name === "helper")).toBe(true);
    expect(result.callers.every((entry) => entry.edge.kind === "calls")).toBe(true);
    expect(result.callers.every((entry) => entry.edge.confidence === "INFERRED")).toBe(true);
    expect(result.path).toBeNull();
  });

  it("resolves a symbol target and lists its callers", async () => {
    const result = await impactCommand({ target: "helper", root: ROOT });

    expect(result.kind).toBe("symbol");
    expect(result.node.name).toBe("helper");
    expect(result.node.file).toBe("src/beta.ts");
    expect(result.definitions.map((node) => node.id)).toEqual([result.node.id]);
    expect(result.importers.map((entry) => entry.node.id)).toEqual([
      "file:src/alpha.ts",
      "file:src/gamma.ts",
    ]);
    expect(result.callers.map((entry) => entry.caller?.name)).toEqual(["alpha", "gamma"]);
  });

  it("resolves absolute paths and bare file basenames", async () => {
    const absolute = await impactCommand({ target: join(ROOT, "src", "alpha.ts"), root: ROOT });
    expect(absolute.kind).toBe("file");
    expect(absolute.node.id).toBe("file:src/alpha.ts");

    const basename = await impactCommand({ target: "beta.ts", root: ROOT });
    expect(basename.kind).toBe("file");
    expect(basename.node.id).toBe("file:src/beta.ts");
  });

  it("returns the shortest path when a second target is given", async () => {
    const result = await impactCommand({ target: "helper", to: "gamma", root: ROOT });

    expect(result.path).not.toBeNull();
    expect(result.path!.nodeIds).toHaveLength(2);
    expect(result.path!.nodeIds[0]).toBe(result.node.id);
    expect(result.path!.nodes[1].name).toBe("gamma");
    expect(
      result.path!.edges.some((edge) => edge.kind === "calls" && edge.confidence === "INFERRED"),
    ).toBe(true);
  });

  it("returns a null path for disconnected targets", async () => {
    const result = await impactCommand({ target: "src/alpha.ts", to: "src/isolated.ts", root: ROOT });
    expect(result.path).toBeNull();
  });

  it("throws for unknown targets and empty input", async () => {
    await expect(impactCommand({ target: "ghost", root: ROOT })).rejects.toThrow(
      /no file or symbol matches/,
    );
    await expect(impactCommand({ target: "   ", root: ROOT })).rejects.toThrow(/target required/);
  });
});
