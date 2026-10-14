import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandContext } from "../../core/types.js";
import { validateNativeSkillCommand } from "./validate.js";

const metadata = `---\nname: build-docs\ndescription: Builds repository documentation when a task requires authoring or updating project guides.\n---\n`;

function createContext(workspacePath?: string): CommandContext {
  return {
    vaultFs: {} as any,
    vaultPath: "/unused-vault",
    sessionRegistry: {} as any,
    config: {} as any,
    log: { debug() {}, info() {}, warn() {}, error() {} },
    workspacePath,
  };
}

describe("validateNativeSkillCommand", () => {
  let workspacePath: string;

  beforeEach(async () => {
    workspacePath = await mkdtemp(join(tmpdir(), "native-skill-validate-"));
  });

  afterEach(async () => {
    await rm(workspacePath, { recursive: true, force: true });
  });

  it("validates a full local skill bundle without resolving external links or dependencies", async () => {
    const skillDir = join(workspacePath, "skills", "build-docs");
    await mkdir(join(skillDir, "references"), { recursive: true });
    await mkdir(join(skillDir, "scripts"));
    await writeFile(join(skillDir, "references", "guide.md"), "Reference guide");
    await writeFile(join(skillDir, "scripts", "build.js"), "process.exit(0)");
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\nRead [the guide](references/guide.md). Run \`node scripts/build.js\`. Install with \`npx unknown-skill-dependency\`. See [external docs](https://example.test/docs) and [this section](#usage).`);

    const result = await validateNativeSkillCommand({ path: "skills/build-docs" }, createContext(workspacePath));

    expect(result.success).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.counts.errors).toBe(0);
    expect(result.checked_paths).toEqual(expect.arrayContaining([
      "skills/build-docs/SKILL.md",
      "skills/build-docs/references/guide.md",
      "skills/build-docs/scripts/build.js",
    ]));
    expect(result.issues.some((issue) => issue.severity === "error")).toBe(false);
  });

  it("fails closed for missing path or missing workspace instead of using the process cwd", async () => {
    const missingPath = await validateNativeSkillCommand({}, createContext(workspacePath));
    const missingWorkspace = await validateNativeSkillCommand({ path: "skill" }, createContext());

    expect(missingPath.success).toBe(false);
    expect(missingPath.counts.errors).toBeGreaterThan(0);
    expect(missingWorkspace.success).toBe(false);
    expect(missingWorkspace.counts.errors).toBeGreaterThan(0);
  });

  it("rejects lexical paths outside the workspace", async () => {
    const result = await validateNativeSkillCommand({ path: "../outside/SKILL.md" }, createContext(workspacePath));
    expect(result.valid).toBe(false);
    expect(result.counts.errors).toBeGreaterThan(0);
  });

  it("rejects required references escaping the skill directory", async () => {
    const skillDir = join(workspacePath, "skill");
    await mkdir(skillDir);
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\nSee [outside](../outside.md).`);
    await writeFile(join(workspacePath, "outside.md"), "Not part of the skill");

    const result = await validateNativeSkillCommand({ path: "skill/SKILL.md" }, createContext(workspacePath));

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "reference.escape" && issue.severity === "error")).toBe(true);
  });

  it("does not let nearby optional prose waive a required link, but permits explicit optional labels", async () => {
    const skillDir = join(workspacePath, "skill");
    await mkdir(skillDir);
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\nSee [required](references/required.md). This also describes an optional behavior.\nOptionally run [optional helper](scripts/optional.sh).\nOptional: [fallback details](references/fallback.md).`);

    const result = await validateNativeSkillCommand({ path: "skill" }, createContext(workspacePath));

    expect(result.valid).toBe(false);
    expect(result.issues.filter((issue) => issue.code === "reference.missing")).toHaveLength(1);
  });

  it.each([
    ["drive-absolute slash path", "C:/Windows/win.ini"],
    ["drive-absolute backslash path", String.raw`C:\Windows\win.ini`],
    ["file URI", "file:///etc/passwd"],
    ["UNC backslash path", String.raw`\\server\share\private.txt`],
    ["UNC slash path", "//server/share/private.txt"],
    ["encoded drive path", "%43%3A%2FWindows%2Fwin.ini"],
    ["encoded UNC path", "%5C%5Cserver%5Cshare%5Cprivate.txt"],
    ["encoded file URI", "file%3A%2F%2F%2Fetc%2Fpasswd"],
  ])("rejects %s without returning paths or file contents", async (_label, target) => {
    const skillDir = join(workspacePath, "skill");
    await mkdir(skillDir);
    const privateMarker = "PRIVATE-SKILL-CONTENT";
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\n${privateMarker}\nRead [external local path](${target}).`);

    const result = await validateNativeSkillCommand({ path: "skill" }, createContext(workspacePath));

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "reference.escape" && issue.severity === "error")).toBe(true);
    expect(result.checked_paths).toEqual(["skill/SKILL.md"]);
    expect(JSON.stringify(result)).not.toContain(privateMarker);
    expect(JSON.stringify(result)).not.toContain(target);
  });

  it("rejects symlinked skill and referenced files", async () => {
    const skillDir = join(workspacePath, "skill");
    const outsideDir = join(workspacePath, "outside");
    await mkdir(skillDir);
    await mkdir(outsideDir);
    await writeFile(join(outsideDir, "SKILL.md"), `${metadata}\nSee [linked](linked.md).`);
    await symlink(join(outsideDir, "SKILL.md"), join(skillDir, "SKILL.md"));
    await writeFile(join(outsideDir, "linked.md"), "Outside");

    const linkedSkill = await validateNativeSkillCommand({ path: "skill/SKILL.md" }, createContext(workspacePath));
    expect(linkedSkill.valid).toBe(false);

    await rm(join(skillDir, "SKILL.md"));
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\nSee [linked](linked.md).`);
    await symlink(join(outsideDir, "linked.md"), join(skillDir, "linked.md"));
    const linkedReference = await validateNativeSkillCommand({ path: "skill" }, createContext(workspacePath));
    expect(linkedReference.valid).toBe(false);
    expect(linkedReference.issues.some((issue) => issue.code === "reference.symlink")).toBe(true);
  });

  it("rejects oversized metadata without returning file contents", async () => {
    const skillDir = join(workspacePath, "skill");
    await mkdir(skillDir);
    const marker = "TOP-SECRET-SKILL-BODY";
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\n${marker}\n${"x".repeat(1024 * 1024)}`);

    const result = await validateNativeSkillCommand({ path: "skill" }, createContext(workspacePath));

    expect(result.valid).toBe(false);
    expect(JSON.stringify(result)).not.toContain(marker);
  });

  it("reports strict native metadata failures while keeping file content private", async () => {
    const skillDir = join(workspacePath, "skill");
    await mkdir(skillDir);
    const marker = "PRIVATE-DESCRIPTION-MARKER";
    await writeFile(join(skillDir, "SKILL.md"), `---\nname: BadName\ndescription: <tag>${marker}</tag>\n---\nBody`);

    const result = await validateNativeSkillCommand({ path: "skill" }, createContext(workspacePath));

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === "name" && issue.severity === "error")).toBe(true);
    expect(result.issues.some((issue) => issue.field === "description" && issue.severity === "error")).toBe(true);
    expect(JSON.stringify(result)).not.toContain(marker);
  });

  it("warns when a bounded text reference exceeds 100 lines without useful navigation", async () => {
    const skillDir = join(workspacePath, "skill");
    await mkdir(join(skillDir, "references"), { recursive: true });
    const longText = Array.from({ length: 101 }, (_, index) => `Reference detail ${index}`).join("\n");
    await writeFile(join(skillDir, "references", "long.md"), longText);
    await writeFile(join(skillDir, "references", "notes.txt"), longText);
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\nRead [the guide](references/long.md) and [notes](references/notes.txt).`);

    const result = await validateNativeSkillCommand({ path: "skill" }, createContext(workspacePath));

    expect(result.valid).toBe(true);
    expect(result.issues.filter((issue) => issue.code === "reference.toc-recommended")).toHaveLength(2);
    expect(result.issues.every((issue) => issue.severity !== "error")).toBe(true);
  });

  it("accepts a concise 50-token workflow without encouraging filler", async () => {
    const skillDir = join(workspacePath, "skill");
    await mkdir(skillDir);
    const workflow = Array.from({ length: 50 }, (_, index) => `step${index}`).join(" ");
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\n${workflow}`);

    const result = await validateNativeSkillCommand({ path: "skill" }, createContext(workspacePath));

    expect(result.valid).toBe(true);
    expect(result.counts.errors).toBe(0);
    expect(result.counts.warnings).toBe(0);
    expect(result.issues.some((issue) => issue.code === "body.line-limit")).toBe(false);
  });

  it("warns, but does not fail, when the SKILL body exceeds 500 lines", async () => {
    const skillDir = join(workspacePath, "skill");
    await mkdir(skillDir);
    const body = Array.from({ length: 501 }, (_, index) => `Instruction ${index}`).join("\n");
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\n${body}`);

    const result = await validateNativeSkillCommand({ path: "skill" }, createContext(workspacePath));

    expect(result.valid).toBe(true);
    expect(result.issues.some((issue) => issue.code === "body.line-limit" && issue.severity === "warning")).toBe(true);
  });

  it("does not warn at exactly 500 SKILL body lines", async () => {
    const skillDir = join(workspacePath, "skill");
    await mkdir(skillDir);
    const body = Array.from({ length: 500 }, (_, index) => `Instruction ${index}`).join("\n");
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\n${body}`);

    const result = await validateNativeSkillCommand({ path: "skill" }, createContext(workspacePath));

    expect(result.issues.some((issue) => issue.code === "body.line-limit")).toBe(false);
  });

  it("accepts a long reference index when it is already a structured link list", async () => {
    const skillDir = join(workspacePath, "skill");
    await mkdir(join(skillDir, "references"), { recursive: true });
    const index = [
      "# Reference index",
      "",
      "- [Overview](overview.md)",
      "- [Examples](examples.md)",
      ...Array.from({ length: 98 }, (_, line) => `Reference detail ${line}`),
    ].join("\n");
    await writeFile(join(skillDir, "references", "index.md"), index);
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\nUse the [reference index](references/index.md).`);

    const result = await validateNativeSkillCommand({ path: "skill" }, createContext(workspacePath));

    expect(result.valid).toBe(true);
    expect(result.issues.some((issue) => issue.code === "reference.toc-recommended")).toBe(false);
  });

  it("checks PNG and PDF references as files without decoding them as text", async () => {
    const skillDir = join(workspacePath, "skill");
    await mkdir(join(skillDir, "assets"), { recursive: true });
    await writeFile(join(skillDir, "assets", "preview.png"), Buffer.from([0xff, 0x00, 0x89, 0x50, 0x4e, 0x47]));
    await writeFile(join(skillDir, "assets", "guide.pdf"), Buffer.from([0xff, 0x00, 0x25, 0x50, 0x44, 0x46]));
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\nSee [preview](assets/preview.png) and [guide](assets/guide.pdf).`);

    const result = await validateNativeSkillCommand({ path: "skill" }, createContext(workspacePath));

    expect(result.valid).toBe(true);
    expect(result.checked_paths).toEqual(expect.arrayContaining([
      "skill/assets/preview.png",
      "skill/assets/guide.pdf",
    ]));
    expect(result.issues.some((issue) => issue.code === "reference.toc-recommended")).toBe(false);
  });

  it("rejects reference scans above the candidate limit", async () => {
    const skillDir = join(workspacePath, "skill");
    await mkdir(skillDir);
    const links = Array.from({ length: 2049 }, (_, index) => `[ref${index}](https://example.test/${index})`).join(" ");
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\n${links}`);

    const result = await validateNativeSkillCommand({ path: "skill" }, createContext(workspacePath));

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "references.limit" && issue.severity === "error")).toBe(true);
  });

  it("does not scan oversized text references and reports the bound without echoing contents", async () => {
    const skillDir = join(workspacePath, "skill");
    await mkdir(join(skillDir, "references"), { recursive: true });
    const marker = "PRIVATE-REFERENCE-CONTENT";
    await writeFile(join(skillDir, "references", "large.md"), `${marker}\n${"x".repeat(1024 * 1024)}`);
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\nRead [the large guide](references/large.md).`);

    const result = await validateNativeSkillCommand({ path: "skill" }, createContext(workspacePath));

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "reference.text-limit" && issue.severity === "error")).toBe(true);
    expect(JSON.stringify(result)).not.toContain(marker);
  });

  it("caps aggregate text reference reads", async () => {
    const skillDir = join(workspacePath, "skill");
    await mkdir(join(skillDir, "references"), { recursive: true });
    const links: string[] = [];
    const text = "x".repeat(900 * 1024);
    for (let index = 0; index < 5; index++) {
      await writeFile(join(skillDir, "references", `large-${index}.md`), text);
      links.push(`[reference ${index}](references/large-${index}.md)`);
    }
    await writeFile(join(skillDir, "SKILL.md"), `${metadata}\n${links.join(" ")}`);

    const result = await validateNativeSkillCommand({ path: "skill" }, createContext(workspacePath));

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "references.text-budget" && issue.severity === "error")).toBe(true);
  });
});
