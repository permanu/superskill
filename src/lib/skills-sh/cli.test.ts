import { describe, it, expect, vi, beforeEach } from "vitest";
import { execFile } from "node:child_process";
import { findSkills, installSkill } from "./cli.js";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

describe("findSkills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses CLI output into CliSearchResult array", async () => {
    const stdout = [
      "vercel-labs/agent-skills@react-best-practices — React best practices for agents",
      "some-org/skill-pkg@typescript-tips — TypeScript tips and tricks",
    ].join("\n");

    vi.mocked(execFile).mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: any) => {
        cb(null, { stdout, stderr: "" });
        return {} as any;
      }) as any,
    );

    const results = await findSkills("react testing");
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      id: "vercel-labs/agent-skills@react-best-practices",
      name: "react-best-practices",
      source: "vercel-labs/agent-skills",
      description: "React best practices for agents",
    });
    expect(results[1]).toEqual({
      id: "some-org/skill-pkg@typescript-tips",
      name: "typescript-tips",
      source: "some-org/skill-pkg",
      description: "TypeScript tips and tricks",
    });
  });

  it("calls npx skills find with correct args", async () => {
    vi.mocked(execFile).mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: any) => {
        cb(null, { stdout: "", stderr: "" });
        return {} as any;
      }) as any,
    );

    await findSkills("react");
    expect(execFile).toHaveBeenCalledWith(
      "npx",
      ["skills", "find", "react"],
      expect.objectContaining({ timeout: 30_000 }),
      expect.any(Function),
    );
  });

  it("returns empty array on CLI failure", async () => {
    vi.mocked(execFile).mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: any) => {
        cb(new Error("command not found"), null as any);
        return {} as any;
      }) as any,
    );

    const results = await findSkills("react");
    expect(results).toEqual([]);
  });

  it("returns empty array for unparseable output", async () => {
    vi.mocked(execFile).mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: any) => {
        cb(null, { stdout: "no valid lines here\njust garbage", stderr: "" });
        return {} as any;
      }) as any,
    );

    const results = await findSkills("react");
    expect(results).toEqual([]);
  });

  it("filters empty lines", async () => {
    vi.mocked(execFile).mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: any) => {
        cb(null, {
          stdout: "\n\norg/repo@skill — desc\n\n",
          stderr: "",
        });
        return {} as any;
      }) as any,
    );

    const results = await findSkills("test");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("org/repo@skill");
  });
});

describe("installSkill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true on successful install", async () => {
    vi.mocked(execFile).mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: any) => {
        cb(null, { stdout: "installed", stderr: "" });
        return {} as any;
      }) as any,
    );

    const result = await installSkill("org/repo@skill");
    expect(result).toBe(true);
  });

  it("returns false on failure", async () => {
    vi.mocked(execFile).mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: any) => {
        cb(new Error("install failed"), null as any);
        return {} as any;
      }) as any,
    );

    const result = await installSkill("org/repo@skill");
    expect(result).toBe(false);
  });

  it("calls npx skills add with -g -y by default", async () => {
    vi.mocked(execFile).mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: any) => {
        cb(null, { stdout: "", stderr: "" });
        return {} as any;
      }) as any,
    );

    await installSkill("org/repo@skill");
    expect(execFile).toHaveBeenCalledWith(
      "npx",
      ["skills", "add", "org/repo@skill", "-g", "-y"],
      expect.objectContaining({ timeout: 60_000 }),
      expect.any(Function),
    );
  });

  it("omits -g when global is false", async () => {
    vi.mocked(execFile).mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: any) => {
        cb(null, { stdout: "", stderr: "" });
        return {} as any;
      }) as any,
    );

    await installSkill("org/repo@skill", { global: false });
    expect(execFile).toHaveBeenCalledWith(
      "npx",
      ["skills", "add", "org/repo@skill", "-y"],
      expect.objectContaining({ timeout: 60_000 }),
      expect.any(Function),
    );
  });

  it("omits -y when yes is false", async () => {
    vi.mocked(execFile).mockImplementation(
      ((_cmd: string, _args: string[], _opts: any, cb: any) => {
        cb(null, { stdout: "", stderr: "" });
        return {} as any;
      }) as any,
    );

    await installSkill("org/repo@skill", { yes: false });
    expect(execFile).toHaveBeenCalledWith(
      "npx",
      ["skills", "add", "org/repo@skill", "-g"],
      expect.objectContaining({ timeout: 60_000 }),
      expect.any(Function),
    );
  });
});
