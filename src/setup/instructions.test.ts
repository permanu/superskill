import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import {
  writeMarkdownInstruction,
  removeMarkdownInstruction,
  writeMdcInstruction,
  removeMdcInstruction,
} from "./instructions.js";
import { INSTRUCTION_TEXT, PREVIOUS_LIFECYCLE_INSTRUCTION_TEXT } from "./types.js";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

const mockRead = vi.mocked(readFileSync);
const mockWrite = vi.mocked(writeFileSync);
const mockExists = vi.mocked(existsSync);
const mockUnlink = vi.mocked(unlinkSync);

beforeEach(() => vi.resetAllMocks());

describe("INSTRUCTION_TEXT", () => {
  it("states the minimal harness rules", () => {
    expect(INSTRUCTION_TEXT).toContain("superskill` tool with your task");
    expect(INSTRUCTION_TEXT).toContain("gate check");
    expect(INSTRUCTION_TEXT).toContain("session");
    expect(INSTRUCTION_TEXT).toContain("explore|implement|review|ship");
    expect(INSTRUCTION_TEXT).toContain("before verification or completion");
    expect(INSTRUCTION_TEXT).toContain("worktree assessment");
    expect(INSTRUCTION_TEXT).toContain("local stack");
    expect(INSTRUCTION_TEXT).toContain("At every session start");
    expect(INSTRUCTION_TEXT).toContain("register tool with path");
    expect(INSTRUCTION_TEXT).toContain("initializes a missing graph");
    expect(INSTRUCTION_TEXT).toContain("proven merged into main");
    expect(INSTRUCTION_TEXT).toContain("Only verified rules are injected by default");
    expect(INSTRUCTION_TEXT).toContain("catalog/constitution.md");
  });
});

const previousInstruction = `SuperSkill knowledge base + rules (MCP server: superskill).
- Call the \`superskill\` tool with your task before creative work, debugging, or review.
- No "done" without \`gate check\` evidence.
- Only verified rules are injected by default.
- Constitution: catalog/constitution.md in the superskill package (always applies).`;

describe("writeMarkdownInstruction", () => {
  it.each([previousInstruction, PREVIOUS_LIFECYCLE_INSTRUCTION_TEXT])("refreshes a known managed block in place without force", previous => {
    mockExists.mockReturnValue(true);
    const before = "# Personal\n\n\n";
    const after = "\n\n# Keep exactly\n\n";
    mockRead.mockReturnValue(`${before}<!-- superskill:start -->\n${previous}\n<!-- superskill:end -->${after}`);
    expect(writeMarkdownInstruction("/path/AGENTS.md")).toBe("appended");
    expect(mockWrite).toHaveBeenCalledWith("/path/AGENTS.md", `${before}<!-- superskill:start -->\n${INSTRUCTION_TEXT}\n<!-- superskill:end -->${after}`, "utf-8");
  });

  it.each([
    `<!-- superskill:start -->\n${previousInstruction}\nMy custom instruction\n<!-- superskill:end -->`,
    `<!-- superskill:start -->\n${previousInstruction}`,
    `<!-- superskill:start -->\n${previousInstruction}\n<!-- superskill:end -->\n<!-- superskill:start -->\ncustom\n<!-- superskill:end -->`,
    `<!-- superskill:start -->\n${INSTRUCTION_TEXT}\n<!-- superskill:end -->`,
  ])("preserves custom, incomplete, duplicate and current blocks", content => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue(content);
    expect(writeMarkdownInstruction("/path/AGENTS.md")).toBe("exists");
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it("creates new file with markers when file does not exist", () => {
    mockExists.mockReturnValue(false);
    const result = writeMarkdownInstruction("/path/CLAUDE.md");
    expect(result).toBe("created");
    const written = mockWrite.mock.calls[0][1] as string;
    expect(written).toContain("<!-- superskill:start -->");
    expect(written).toContain("<!-- superskill:end -->");
    expect(written).toContain("gate check");
    expect(written).toContain("catalog/constitution.md");
  });

  it("appends to existing file", () => {
    mockExists.mockImplementation((p) => String(p) === "/path/CLAUDE.md");
    mockRead.mockReturnValue("# Existing content\n");
    const result = writeMarkdownInstruction("/path/CLAUDE.md");
    expect(result).toBe("appended");
    const written = mockWrite.mock.calls[0][1] as string;
    expect(written).toContain("# Existing content");
    expect(written).toContain("<!-- superskill:start -->");
  });

  it("returns 'exists' when markers already present", () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue("<!-- superskill:start -->\nstuff\n<!-- superskill:end -->\n");
    expect(writeMarkdownInstruction("/path/CLAUDE.md")).toBe("exists");
    expect(mockWrite).not.toHaveBeenCalled();
  });
});

describe("removeMarkdownInstruction", () => {
  it("removes block between markers", () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue(
      "# Existing\n\n<!-- superskill:start -->\ninstruction\n<!-- superskill:end -->\n"
    );
    expect(removeMarkdownInstruction("/path/CLAUDE.md")).toBe(true);
    const written = mockWrite.mock.calls[0][1] as string;
    expect(written).not.toContain("superskill");
    expect(written).toContain("# Existing");
  });

  it("returns false when file does not exist", () => {
    mockExists.mockReturnValue(false);
    expect(removeMarkdownInstruction("/path/CLAUDE.md")).toBe(false);
  });

  it("returns false when no markers found", () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue("# Just content\n");
    expect(removeMarkdownInstruction("/path/CLAUDE.md")).toBe(false);
  });
});

describe("writeMdcInstruction", () => {
  it("writes .mdc file with frontmatter", () => {
    mockExists.mockReturnValue(false);
    writeMdcInstruction("/path/superskill.mdc");
    const written = mockWrite.mock.calls[0][1] as string;
    expect(written).toContain("description: SuperSkill knowledge base integration");
    expect(written).toContain("alwaysApply: true");
    expect(written).toContain("gate check");
    expect(written).toContain("catalog/constitution.md");
  });
});

describe("removeMdcInstruction", () => {
  it("deletes the .mdc file when it exists", () => {
    mockExists.mockReturnValue(true);
    const result = removeMdcInstruction("/path/superskill.mdc");
    expect(result).toBe(true);
    expect(mockUnlink).toHaveBeenCalledWith("/path/superskill.mdc");
  });

  it("returns false when file does not exist", () => {
    mockExists.mockReturnValue(false);
    expect(removeMdcInstruction("/path/superskill.mdc")).toBe(false);
    expect(mockUnlink).not.toHaveBeenCalled();
  });
});
