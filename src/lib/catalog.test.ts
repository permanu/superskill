import { describe, it, expect } from "vitest";
import { loadCatalog, catalogFile } from "./catalog.js";
import { readFile } from "node:fs/promises";

describe("loadCatalog", () => {
  it("indexes in-repo packs", async () => {
    const skills = await loadCatalog();
    const ids = skills.map((s) => s.id);
    expect(ids).toContain("memory/graph");
    expect(ids).toContain("code/typescript");
    expect(ids).toContain("review/architect");
    expect(ids).toContain("security/index");
    expect(ids).toContain("security/compliance");
    expect(ids).toContain("pipeline/delivery");
    expect(ids).toContain("pipeline/qa");
    expect(skills.find((s) => s.id === "pipeline/delivery")?.always).toBe(true);
    expect(ids).toContain("pipeline/norms");
    expect(ids).toContain("optimizer/algorithm");
    expect(ids).toContain("pipeline/tdd");
    expect(ids).toContain("pipeline/grill");
    expect(ids).toContain("pipeline/systems");
    expect(skills.find((s) => s.id === "pipeline/systems")?.always).toBe(true);
    expect(ids).toContain("pipeline/verify");
    expect(ids).toContain("devops/sre");
    expect(skills.find((s) => s.id === "optimizer/algorithm")?.always).toBe(true);
    expect(skills.find((s) => s.id === "pipeline/norms")?.always).toBe(true);
    expect(skills.find((s) => s.id === "memory/graph")?.always).toBe(true);
    expect(skills.find((s) => s.id === "security/index")?.always).toBe(true);
    expect(skills.find((s) => s.id === "code/typescript")?.langs).toContain("typescript");
  });

  it("catalog files exist on disk", async () => {
    const raw = await readFile(catalogFile("code/typescript"), "utf-8");
    expect(raw).toContain("pack: code");
  });
});
