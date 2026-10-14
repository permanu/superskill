import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  hasManagedInstructionBlock,
  planMarkdownInstruction,
  planMdcInstruction,
  writeMarkdownInstruction,
  removeMarkdownInstruction,
  writeMdcInstruction,
  removeMdcInstruction,
} from "./instructions.js";
import {
  INSTRUCTION_TEXT,
  MARKER_BEGIN_HTML,
  MARKER_END_HTML,
  MARKER_START_HTML,
  PREVIOUS_INSTRUCTION_TEXT,
  PREVIOUS_LIFECYCLE_INSTRUCTION_TEXT,
  PREVIOUS_SESSION_INSTRUCTION_TEXT,
  PREVIOUS_CLEANUP_INSTRUCTION_TEXT,
  PREVIOUS_ARCHIVE_INSTRUCTION_TEXT,
} from "./types.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempFile(name = "AGENTS.md"): string {
  const root = mkdtempSync(join(tmpdir(), "instructions-"));
  roots.push(root);
  return join(root, name);
}

function marked(text: string, open = MARKER_BEGIN_HTML): string {
  return `${open}\n${text}\n${MARKER_END_HTML}`;
}

const previousInstruction = PREVIOUS_INSTRUCTION_TEXT;

describe("INSTRUCTION_TEXT", () => {
  it("keeps the managed instructions concise, scoped, and safe", () => {
    expect(INSTRUCTION_TEXT.length).toBeLessThan(2000);
    expect(INSTRUCTION_TEXT).toContain("host-configured, project-scoped MCP");
    expect(INSTRUCTION_TEXT).toContain("tools.superskill.<tool>");
    expect(INSTRUCTION_TEXT).toContain('session tool (action: "register"');
    expect(INSTRUCTION_TEXT).toContain("session_id");
    expect(INSTRUCTION_TEXT).toContain("Call the superskill tool with task, repo-relative files");
    expect(INSTRUCTION_TEXT).toContain("reroute only when task, files, or phase meaningfully change");
    expect(INSTRUCTION_TEXT).toContain("Simple/read-only work needs no session/plan");
    expect(INSTRUCTION_TEXT).toContain("redact prompts by default");
    expect(INSTRUCTION_TEXT).toContain("include_prompts only for bounded current-project excerpts explicitly requested and needed");
    expect(INSTRUCTION_TEXT).toContain("Registration/completion are coordination bookkeeping for authorized nontrivial work");
    expect(INSTRUCTION_TEXT).toContain("completion persists a session note");
    expect(INSTRUCTION_TEXT).toContain("Additional ADR/learning/task/report writes need a request or project policy");
    expect(INSTRUCTION_TEXT).toContain("if read_complete is false, continue at next_offset_bytes");
    expect(INSTRUCTION_TEXT).toContain("worktree_env before installs/builds");
    expect(INSTRUCTION_TEXT).toContain("Built-in session maintenance may automatically quarantine eligible clean, idle, session-owned checkouts after session completion");
    expect(INSTRUCTION_TEXT).toContain("locked recovery archive with metadata; it never deletes");
    expect(INSTRUCTION_TEXT).toContain("Assessment alone does not authorize manual actions");
    expect(INSTRUCTION_TEXT).toContain("manual cleanup/cache apply/GC/permanent removal/config/install requires explicit approval");
    expect(INSTRUCTION_TEXT).toContain("Only verified rules are injected by default");
    expect(INSTRUCTION_TEXT).not.toMatch(/never expose secrets, prompts, or unrelated history/i);
    expect(INSTRUCTION_TEXT).not.toContain("catalog/");
    expect(INSTRUCTION_TEXT).not.toContain(MARKER_BEGIN_HTML);
  });
});

describe("writeMarkdownInstruction", () => {
  it.each([
    previousInstruction,
    PREVIOUS_LIFECYCLE_INSTRUCTION_TEXT,
    PREVIOUS_SESSION_INSTRUCTION_TEXT,
    PREVIOUS_CLEANUP_INSTRUCTION_TEXT,
    PREVIOUS_ARCHIVE_INSTRUCTION_TEXT,
  ])("refreshes a known managed block in place without force", previous => {
    const path = tempFile();
    const before = "# Personal\n\n\n";
    const after = "\n\n# Keep exactly\n\n";
    writeFileSync(path, `${before}${marked(previous)}${after}`);
    expect(writeMarkdownInstruction(path)).toBe("appended");
    expect(readFileSync(path, "utf-8")).toBe(`${before}${marked(INSTRUCTION_TEXT)}${after}`);
  });

  it("upgrades the exact archive-era block and preserves surrounding user bytes", () => {
    const path = tempFile();
    const before = "# Personal bytes stay\n\n";
    const after = "\n\n## User section\nKeep this exactly.\n";
    expect(PREVIOUS_ARCHIVE_INSTRUCTION_TEXT).toContain("cleanup may relocate only clean, idle, session-owned worktrees proven integrated into the repository's default branch");
    expect(PREVIOUS_ARCHIVE_INSTRUCTION_TEXT).toContain("It never automatically deletes a checkout; inspect the returned recovery metadata.");
    writeFileSync(path, `${before}${marked(PREVIOUS_ARCHIVE_INSTRUCTION_TEXT)}${after}`);

    expect(writeMarkdownInstruction(path)).toBe("appended");
    expect(readFileSync(path, "utf-8")).toBe(`${before}${marked(INSTRUCTION_TEXT)}${after}`);
  });

  it("upgrades a legacy superskill:start block to the current marker format", () => {
    const path = tempFile();
    writeFileSync(path, `# Personal\n\n${marked(previousInstruction, MARKER_START_HTML)}\n`);
    expect(writeMarkdownInstruction(path)).toBe("appended");
    const content = readFileSync(path, "utf-8");
    expect(content).toContain(MARKER_BEGIN_HTML);
    expect(content).toContain(INSTRUCTION_TEXT);
    expect(content).toContain("# Personal");
  });

  it.each([
    marked(`${previousInstruction}\nMy custom instruction`),
    marked(`${PREVIOUS_ARCHIVE_INSTRUCTION_TEXT}\nMy custom instruction`),
    `${MARKER_BEGIN_HTML}\n${previousInstruction}`,
    `${marked(previousInstruction)}\n${marked("custom")}`,
    marked(INSTRUCTION_TEXT),
  ])("preserves custom, incomplete, duplicate and current blocks", content => {
    const path = tempFile();
    writeFileSync(path, content);
    expect(writeMarkdownInstruction(path)).toBe("exists");
    expect(readFileSync(path, "utf-8")).toBe(content);
  });

  it("creates new files with begin/end markers", () => {
    const path = tempFile("CLAUDE.md");
    expect(writeMarkdownInstruction(path)).toBe("created");
    const written = readFileSync(path, "utf-8");
    expect(written).toContain(MARKER_BEGIN_HTML);
    expect(written).toContain(MARKER_END_HTML);
    expect(written).toContain("tools.superskill.<tool>");
    expect(written).toContain("next_offset_bytes");
  });

  it("appends to an existing file and preserves user content outside the block", () => {
    const path = tempFile("CLAUDE.md");
    writeFileSync(path, "# Existing content\n\nUser notes live here.\n");
    expect(writeMarkdownInstruction(path)).toBe("appended");
    const written = readFileSync(path, "utf-8");
    expect(written).toContain("# Existing content");
    expect(written).toContain("User notes live here.");
    expect(written).toContain(MARKER_BEGIN_HTML);

    expect(writeMarkdownInstruction(path)).toBe("exists");
    expect(readFileSync(path, "utf-8")).toBe(written);
  });

  it("returns 'exists' for an unknown managed block without writing", () => {
    const path = tempFile("CLAUDE.md");
    const content = marked("stuff");
    writeFileSync(path, content);
    expect(writeMarkdownInstruction(path)).toBe("exists");
    expect(readFileSync(path, "utf-8")).toBe(content);
    expect(hasManagedInstructionBlock(content)).toBe(true);
  });
});

describe("planMarkdownInstruction", () => {
  it("reports what would happen without touching the file", () => {
    const missing = tempFile("missing.md");
    expect(planMarkdownInstruction(missing)).toBe("created");
    expect(existsSync(missing)).toBe(false);

    const current = tempFile("current.md");
    writeFileSync(current, marked(INSTRUCTION_TEXT));
    expect(planMarkdownInstruction(current)).toBe("exists");
    expect(readFileSync(current, "utf-8")).toBe(marked(INSTRUCTION_TEXT));

    const previous = tempFile("previous.md");
    writeFileSync(previous, marked(previousInstruction));
    expect(planMarkdownInstruction(previous)).toBe("appended");
    expect(readFileSync(previous, "utf-8")).toBe(marked(previousInstruction));
  });
});

describe("removeMarkdownInstruction", () => {
  it("removes a block between begin markers", () => {
    const path = tempFile();
    writeFileSync(path, `# Existing\n\n${marked("instruction")}\n`);
    expect(removeMarkdownInstruction(path)).toBe(true);
    const written = readFileSync(path, "utf-8");
    expect(written).not.toContain("superskill");
    expect(written).toContain("# Existing");
  });

  it("removes a legacy superskill:start block", () => {
    const path = tempFile();
    writeFileSync(path, `# Existing\n\n${marked("instruction", MARKER_START_HTML)}\n`);
    expect(removeMarkdownInstruction(path)).toBe(true);
    expect(readFileSync(path, "utf-8")).not.toContain("superskill");
  });

  it("returns false when file does not exist", () => {
    expect(removeMarkdownInstruction(tempFile("missing.md"))).toBe(false);
  });

  it("returns false when no markers found", () => {
    const path = tempFile();
    writeFileSync(path, "# Just content\n");
    expect(removeMarkdownInstruction(path)).toBe(false);
  });
});

describe("writeMdcInstruction", () => {
  it("writes .mdc file with frontmatter and markers", () => {
    const path = tempFile("superskill.mdc");
    expect(writeMdcInstruction(path)).toBe("created");
    const written = readFileSync(path, "utf-8");
    expect(written).toContain("description: SuperSkill knowledge base integration");
    expect(written).toContain("alwaysApply: true");
    expect(written).toContain(MARKER_BEGIN_HTML);
    expect(written).toContain("tools.superskill.<tool>");
    expect(written).toContain("next_offset_bytes");
  });

  it("preserves user content outside the marked block", () => {
    const path = tempFile("superskill.mdc");
    writeFileSync(path, `---\ndescription: SuperSkill knowledge base integration\nalwaysApply: true\n---\n\n${marked(previousInstruction)}\n\nMy extra user notes.\n`);
    expect(writeMdcInstruction(path)).toBe("appended");
    const written = readFileSync(path, "utf-8");
    expect(written).toContain(marked(INSTRUCTION_TEXT));
    expect(written).toContain("My extra user notes.");
    expect(writeMdcInstruction(path)).toBe("exists");
    expect(readFileSync(path, "utf-8")).toBe(written);
  });

  it("migrates an unmarked legacy body without losing custom frontmatter", () => {
    const path = tempFile("superskill.mdc");
    writeFileSync(path, `---\ndescription: custom\nalwaysApply: false\n---\n\n${INSTRUCTION_TEXT}\n`);
    expect(writeMdcInstruction(path)).toBe("appended");
    const written = readFileSync(path, "utf-8");
    expect(written).toContain("description: custom");
    expect(written).toContain(marked(INSTRUCTION_TEXT));
  });
});

describe("planMdcInstruction and removeMdcInstruction", () => {
  it("plans without writing", () => {
    const path = tempFile("superskill.mdc");
    expect(planMdcInstruction(path)).toBe("created");
    expect(existsSync(path)).toBe(false);

    writeFileSync(path, "anything");
    expect(planMdcInstruction(path)).toBe("appended");
    expect(readFileSync(path, "utf-8")).toBe("anything");
  });

  it("deletes the .mdc file when it exists", () => {
    const path = tempFile("superskill.mdc");
    writeFileSync(path, "x");
    expect(removeMdcInstruction(path)).toBe(true);
    expect(existsSync(path)).toBe(false);
  });

  it("returns false when file does not exist", () => {
    expect(removeMdcInstruction(tempFile("missing.mdc"))).toBe(false);
  });
});
