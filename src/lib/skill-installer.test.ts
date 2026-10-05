// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { basename, join } from "path";
import { tmpdir } from "os";
import { mkdir, writeFile, rm, readFile, readdir, stat } from "fs/promises";
import {
  parseSource,
  installSkills,
  removeSkill,
  listInstalledSkills,
  _setInstallDir,
  _resetInstallDir,
} from "./skill-installer.js";

const mocks = vi.hoisted(() => ({
  fetchPublisherSkills: vi.fn(),
  fetchSkillPage: vi.fn(),
  execFile: vi.fn(),
}));

vi.mock("./skills-sh/client.js", () => ({
  fetchPublisherSkills: mocks.fetchPublisherSkills,
  fetchSkillPage: mocks.fetchSkillPage,
}));

vi.mock("child_process", () => ({
  execFile: (...args: any[]) => mocks.execFile(...args),
}));

const UNAUDITED_MARKER = ".unaudited-superskill";

describe("skill-installer", () => {
  let testDir: string;

  beforeEach(async () => {
    vi.resetAllMocks();
    testDir = join(tmpdir(), `skill-installer-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    _setInstallDir(testDir);
  });

  afterEach(async () => {
    _resetInstallDir();
    await rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  describe("parseSource", () => {
    it("parses owner/repo shorthand", () => {
      const result = parseSource("anthropics/skills");
      expect(result).not.toBeNull();
      expect(result!.owner).toBe("anthropics");
      expect(result!.repo).toBe("skills");
      expect(result!.repoUrl).toBe("https://github.com/anthropics/skills.git");
    });

    it("parses owner/repo with subpath", () => {
      const result = parseSource("anthropics/skills/claude-api");
      expect(result!.owner).toBe("anthropics");
      expect(result!.repo).toBe("skills");
      expect(result!.subpath).toBe("claude-api");
    });

    it("parses full GitHub URL", () => {
      const result = parseSource("https://github.com/obra/superpowers");
      expect(result!.owner).toBe("obra");
      expect(result!.repo).toBe("superpowers");
      expect(result!.repoUrl).toBe("https://github.com/obra/superpowers.git");
    });

    it("parses GitHub URL with .git suffix", () => {
      const result = parseSource("https://github.com/obra/superpowers.git");
      expect(result!.repo).toBe("superpowers");
    });

    it("parses GitHub URL with branch and subpath", () => {
      const result = parseSource("https://github.com/obra/superpowers/tree/main/skills/brainstorming");
      expect(result!.owner).toBe("obra");
      expect(result!.repo).toBe("superpowers");
      expect(result!.ref).toBe("main");
      expect(result!.subpath).toBe("skills/brainstorming");
    });

    it("parses github: prefix", () => {
      const result = parseSource("github:anthropics/skills");
      expect(result!.owner).toBe("anthropics");
      expect(result!.repo).toBe("skills");
    });

    it("returns null for invalid source", () => {
      expect(parseSource("not-a-valid-source")).toBeNull();
      expect(parseSource("")).toBeNull();
    });

    it("strips trailing slash", () => {
      const result = parseSource("anthropics/skills/");
      expect(result!.repo).toBe("skills");
      expect(result!.subpath).toBeUndefined();
    });
  });

  describe("installSkills", () => {
    it("returns error for invalid source", async () => {
      const result = await installSkills("not-valid");
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("Invalid source");
    });

    it("installs audited skills from skills.sh without an unaudited marker", async () => {
      mocks.fetchPublisherSkills.mockResolvedValueOnce([
        { owner: "acme", repo: "skills", skill: "good-skill", url: "https://skills.sh/acme/skills/good-skill" },
      ]);
      mocks.fetchSkillPage.mockResolvedValueOnce({
        name: "good-skill",
        owner: "acme",
        repo: "skills",
        skill: "good-skill",
        installs: 10,
        stars: 5,
        audits: { gen: "pass", socket: "pass", snyk: "pass" },
        skillMd: "# Good skill",
      });

      const result = await installSkills("acme/skills");

      expect(result.success).toBe(true);
      expect(result.installed).toContain("good-skill");
      const content = await readFile(join(testDir, "good-skill", "SKILL.md"), "utf-8");
      expect(content).toContain("source: skills.sh");
      await expect(stat(join(testDir, "good-skill", UNAUDITED_MARKER))).rejects.toMatchObject({ code: "ENOENT" });
      expect(mocks.execFile).not.toHaveBeenCalled();
    });

    it("refuses the GitHub fallback when skills.sh returns empty results", async () => {
      mocks.fetchPublisherSkills.mockResolvedValueOnce([]);

      const result = await installSkills("acme/skills");

      expect(result.success).toBe(false);
      expect(result.installed).toEqual([]);
      expect(result.errors.join(" ")).toMatch(/Refusing unaudited GitHub fallback/);
      expect(result.warnings.join(" ")).toMatch(/fallback skipped/i);
      expect(mocks.execFile).not.toHaveBeenCalled();
      expect(await readdir(testDir)).toEqual([]);
    });

    it("falls back to GitHub only when skills.sh fetch throws, and marks the install unaudited", async () => {
      mocks.fetchPublisherSkills.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
      mocks.execFile.mockImplementationOnce((...args: any[]) => {
        const [, cmdArgs, , cb] = args as [string, string[], unknown, (err: Error | null, stdout: string, stderr: string) => void];
        const dest = cmdArgs[cmdArgs.length - 1];
        void (async () => {
          await mkdir(join(dest, "fake-skill"), { recursive: true });
          await writeFile(
            join(dest, "fake-skill", "SKILL.md"),
            "---\nname: fake-skill\ndescription: Fake skill\n---\n# Fake",
            "utf-8",
          );
          cb(null, "", "");
        })();
      });

      const result = await installSkills("acme/skills");

      expect(result.success).toBe(true);
      expect(result.installed).toContain("fake-skill");
      expect(result.warnings.join(" ")).toMatch(/without skills.sh audit/i);
      const marker = JSON.parse(await readFile(join(testDir, "fake-skill", UNAUDITED_MARKER), "utf-8"));
      expect(marker.unaudited).toBe(true);
    });

    it("never falls back when skills.sh reports blocked skills", async () => {
      mocks.fetchPublisherSkills.mockResolvedValueOnce([
        { owner: "acme", repo: "skills", skill: "bad-skill", url: "https://skills.sh/acme/skills/bad-skill" },
      ]);
      mocks.fetchSkillPage.mockResolvedValueOnce({
        name: "bad-skill",
        owner: "acme",
        repo: "skills",
        skill: "bad-skill",
        installs: 1,
        stars: 1,
        audits: { gen: "fail", socket: "pass", snyk: "pass" },
        skillMd: "# Bad skill",
      });

      const result = await installSkills("acme/skills");

      expect(result.success).toBe(false);
      expect(result.blocked.length).toBeGreaterThan(0);
      expect(result.blocked[0]).toContain("BLOCKED");
      expect(mocks.execFile).not.toHaveBeenCalled();
      expect(await readdir(testDir)).toEqual([]);
    });
  });

  describe("removeSkill", () => {
    it("removes only the named skill directory", async () => {
      await mkdir(join(testDir, "skill-a"), { recursive: true });
      await mkdir(join(testDir, "skill-b"), { recursive: true });

      const result = await removeSkill("skill-a");

      expect(result.success).toBe(true);
      await expect(stat(join(testDir, "skill-a"))).rejects.toMatchObject({ code: "ENOENT" });
      await expect(stat(join(testDir, "skill-b"))).resolves.toBeDefined();
    });

    it("returns error for nonexistent skill", async () => {
      const result = await removeSkill("nonexistent");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("rejects ../../.ssh and removes nothing", async () => {
      const result = await removeSkill("../../.ssh");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid skill name");
    });

    it("rejects ..", async () => {
      const result = await removeSkill("..");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid skill name");
    });

    it("rejects a traversal name pointing at a sibling directory", async () => {
      const victimDir = join(tmpdir(), `skill-installer-victim-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await mkdir(victimDir, { recursive: true });
      await writeFile(join(victimDir, "keep.md"), "keep", "utf-8");

      try {
        const result = await removeSkill(`../${basename(victimDir)}`);
        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid skill name");
        expect(await readFile(join(victimDir, "keep.md"), "utf-8")).toBe("keep");
      } finally {
        await rm(victimDir, { recursive: true, force: true });
      }
    });
  });

  describe("listInstalledSkills", () => {
    it("lists skills with SKILL.md at root", async () => {
      const skillDir = join(testDir, "my-skill");
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, "SKILL.md"),
        "---\nname: my-skill\ndescription: A great skill\n---\n# My Skill",
        "utf-8",
      );

      const skills = await listInstalledSkills();
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe("my-skill");
      expect(skills[0].description).toBe("A great skill");
    });

    it("lists skills with nested SKILL.md", async () => {
      const skillDir = join(testDir, "nested-skill", "skills", "nested-skill");
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, "SKILL.md"),
        "---\nname: nested-skill\ndescription: Nested\n---\n# Nested",
        "utf-8",
      );

      const skills = await listInstalledSkills();
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe("nested-skill");
    });

    it("skips learned directory", async () => {
      await mkdir(join(testDir, "learned"), { recursive: true });
      const skills = await listInstalledSkills();
      expect(skills).toHaveLength(0);
    });

    it("returns empty for nonexistent install dir", async () => {
      _setInstallDir(join(testDir, "nonexistent"));
      const skills = await listInstalledSkills();
      expect(skills).toEqual([]);
    });
  });
});
