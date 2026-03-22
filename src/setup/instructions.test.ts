import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import {
  writeMarkdownInstruction,
  removeMarkdownInstruction,
  writeMdcInstruction,
  removeMdcInstruction,
} from "./instructions.js";

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

describe("writeMarkdownInstruction", () => {
  it("creates new file with markers when file does not exist", () => {
    mockExists.mockReturnValue(false);
    const result = writeMarkdownInstruction("/path/CLAUDE.md");
    expect(result).toBe("created");
    const written = mockWrite.mock.calls[0][1] as string;
    expect(written).toContain("<!-- superskill:start -->");
    expect(written).toContain("<!-- superskill:end -->");
    expect(written).toContain("vault_project_context");
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
    expect(written).toContain("vault_project_context");
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
