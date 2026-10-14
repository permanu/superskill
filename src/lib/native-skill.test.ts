import { describe, expect, it } from "vitest";
import { assertNativeSkillMetadata, validateNativeSkillMetadata } from "./native-skill.js";

const validMetadata = {
  name: "build-readme",
  description: "Builds and validates project README files when a repository task requires documentation updates.",
};

describe("validateNativeSkillMetadata", () => {
  it("accepts Anthropic-compatible metadata without imposing an internal catalog schema", () => {
    expect(validateNativeSkillMetadata({ ...validMetadata, pack: "unknown-pack", custom: { enabled: true } }))
      .toEqual([]);
  });

  it("reports missing name and description", () => {
    const issues = validateNativeSkillMetadata({});
    expect(issues.filter((issue) => issue.severity === "error" && issue.field === "name")).toHaveLength(1);
    expect(issues.filter((issue) => issue.severity === "error" && issue.field === "description")).toHaveLength(1);
  });

  it.each([
    ["XML in the name", { ...validMetadata, name: "build<tool>" }],
    ["XML in the description", { ...validMetadata, description: "Builds tools <script>when needed</script>." }],
    ["a description longer than 1024 characters", { ...validMetadata, description: "x".repeat(1025) }],
    ["an uppercase name", { ...validMetadata, name: "Build-readme" }],
    ["the reserved Claude name", { ...validMetadata, name: "claude-helper" }],
    ["the reserved Anthropic name", { ...validMetadata, name: "anthropic-helper" }],
  ])("rejects %s for the Anthropic profile", (_label, metadata) => {
    expect(validateNativeSkillMetadata(metadata).some((issue) => issue.severity === "error")).toBe(true);
  });

  it("allows Anthropic-reserved substrings in the portable profile", () => {
    const issues = validateNativeSkillMetadata({ ...validMetadata, name: "claude-helper" }, "portable");
    expect(issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("treats third-person and what/when guidance as quality warnings, not grammatical errors", () => {
    const issues = validateNativeSkillMetadata({ ...validMetadata, name: "build-docs", description: "Write documentation for the repository." });
    expect(issues.some((issue) => issue.code === "description-third-person" && issue.severity === "warning")).toBe(true);
    expect(issues.some((issue) => issue.code === "description-what-when" && issue.severity === "warning")).toBe(true);
    expect(issues.some((issue) => issue.severity === "error")).toBe(false);
  });

  it("does not require a gerund name", () => {
    expect(validateNativeSkillMetadata(validMetadata).some((issue) => issue.severity === "error")).toBe(false);
  });

  it("does not reject quality-warning metadata in the assertion helper", () => {
    expect(() => assertNativeSkillMetadata({ name: "write-docs", description: "Write documentation." })).not.toThrow();
  });

  it("throws an actionable INVALID_ARGUMENT VaultError for invalid metadata", () => {
    try {
      assertNativeSkillMetadata({ name: "Bad Name", description: "" });
      throw new Error("expected assertion to fail");
    } catch (error) {
      expect(error).toMatchObject({ code: "INVALID_ARGUMENT" });
      expect((error as Error).message).toMatch(/native skill metadata/i);
      expect((error as Error).message).toMatch(/name|description/i);
    }
  });
});
