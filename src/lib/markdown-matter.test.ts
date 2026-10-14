import { describe, expect, it } from "vitest";
import grayMatter from "gray-matter";
import matter from "./markdown-matter.js";

describe("data-only markdown boundary", () => {
  it.each(["javascript", "js", "javascript ", "\tjs", "coffee", "constructor", "__proto__"])("refuses the %s engine before parsing", (engine) => {
    expect(() => matter(`---${engine}\n({ title: 'untrusted' })\n---\nbody`)).toThrow("data-only");
  });

  it("does not permit BOM-prefixed executable frontmatter", () => {
    expect(() => matter("\uFEFF---js\n({ title: 'untrusted' })\n---\nbody")).toThrow("data-only");
  });

  it("does not use gray-matter's unbounded content cache", () => {
    const text = "---\ntitle: Unique uncached metadata\n---\nbody";
    matter(text);
    expect((grayMatter as typeof grayMatter & { cache: Record<string, unknown> }).cache[text]).toBeUndefined();
  });

  it("accepts YAML and data-only JSON", () => {
    expect(matter("---yaml\ntitle: YAML\n---\nbody").data).toEqual({ title: "YAML" });
    expect(matter('---json\n{"title":"JSON"}\n---\nbody').data).toEqual({ title: "JSON" });
  });

  it("rejects non-object or oversized metadata", () => {
    expect(() => matter("---\n- one\n- two\n---\nbody")).toThrow("object");
    expect(() => matter(`---\ntitle: ${"a".repeat(256 * 1024)}\n---\nbody`)).toThrow("byte budget");
  });

  it("checks the content engine when serializing", () => {
    expect(() => matter.stringify("---js\n({ title: 'untrusted' })\n---\nbody", { type: "task" })).toThrow("data-only");
  });

  it("keeps metadata edits and body content intact", () => {
    const output = matter.stringify("---\ntitle: Existing\n---\n# Body\n", { status: "active" });
    expect(matter(output).data).toMatchObject({ title: "Existing", status: "active" });
    expect(matter(output).content).toContain("# Body");
  });
});
