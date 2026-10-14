import { describe, expect, it } from "vitest";
import { applyTemplate, getTemplate } from "./templates.js";

describe("templates", () => {
  it("treats variable keys as literal placeholder names", () => {
    const result = applyTemplate("adr", { ".*": "hijacked", "[": "broken", title: "Correct title" });
    expect(result!.body).toContain("# Correct title");
    expect(result!.body).toContain("{{context}}");
    expect(result!.body).not.toContain("hijacked");
  });

  it("preserves replacement dollar sequences literally", () => {
    const title = "$& $$ $` $' $1";
    expect(applyTemplate("adr", { title })!.body.split("\n")[0]).toBe(`# ${title}`);
  });

  it("does not treat inherited object properties as templates", () => {
    for (const type of ["__proto__", "constructor", "toString"]) {
      expect(getTemplate(type)).toBeNull();
      expect(applyTemplate(type, {})).toBeNull();
    }
  });
});
