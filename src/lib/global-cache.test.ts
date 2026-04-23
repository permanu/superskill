import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  setGlobalCacheDir,
  ensureGlobalCacheDir,
  isSkillCached,
  getCachedSkill,
  getSkillMeta,
  cacheSkill,
} from "./global-cache.js";
import type { SkillMeta } from "./global-cache.js";

describe("global-cache", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(
      tmpdir(),
      `global-cache-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(testDir, { recursive: true });
    setGlobalCacheDir(testDir);
  });

  afterEach(async () => {
    setGlobalCacheDir(null);
    await rm(testDir, { recursive: true, force: true });
  });

  function makeMeta(overrides?: Partial<SkillMeta>): SkillMeta {
    return {
      installs: 185_000,
      stars: 1_200,
      fetched_at: Date.now(),
      ...overrides,
    };
  }

  describe("ensureGlobalCacheDir", () => {
    it("creates the skills directory", async () => {
      const dir = await ensureGlobalCacheDir();
      expect(dir).toBe(testDir);
    });

    it("returns existing directory without error", async () => {
      await ensureGlobalCacheDir();
      const dir = await ensureGlobalCacheDir();
      expect(dir).toBe(testDir);
    });
  });

  describe("isSkillCached", () => {
    it("returns false when SKILL.md does not exist", async () => {
      const result = await isSkillCached("owner", "repo", "skill");
      expect(result).toBe(false);
    });

    it("returns true when SKILL.md exists", async () => {
      const dir = join(testDir, "owner", "repo", "skill");
      await mkdir(dir, { recursive: true });
      const { writeFile } = await import("node:fs/promises");
      await writeFile(join(dir, "SKILL.md"), "# content", "utf-8");

      const result = await isSkillCached("owner", "repo", "skill");
      expect(result).toBe(true);
    });
  });

  describe("getCachedSkill", () => {
    it("returns null when SKILL.md does not exist", async () => {
      const result = await getCachedSkill("owner", "repo", "skill");
      expect(result).toBeNull();
    });

    it("returns SKILL.md content", async () => {
      const dir = join(testDir, "owner", "repo", "skill");
      await mkdir(dir, { recursive: true });
      const { writeFile } = await import("node:fs/promises");
      await writeFile(join(dir, "SKILL.md"), "# My Skill\n\nContent here.", "utf-8");

      const result = await getCachedSkill("owner", "repo", "skill");
      expect(result).toBe("# My Skill\n\nContent here.");
    });
  });

  describe("getSkillMeta", () => {
    it("returns null when meta.json does not exist", async () => {
      const result = await getSkillMeta("owner", "repo", "skill");
      expect(result).toBeNull();
    });

    it("returns parsed meta.json", async () => {
      const dir = join(testDir, "owner", "repo", "skill");
      await mkdir(dir, { recursive: true });
      const { writeFile } = await import("node:fs/promises");
      const meta = makeMeta();
      await writeFile(
        join(dir, "meta.json"),
        JSON.stringify(meta, null, 2),
        "utf-8",
      );

      const result = await getSkillMeta("owner", "repo", "skill");
      expect(result).toEqual(meta);
    });
  });

  describe("cacheSkill", () => {
    it("writes SKILL.md and meta.json atomically", async () => {
      const meta = makeMeta();
      await cacheSkill("owner", "repo", "skill", "# Skill Content", meta);

      const skillDir = join(testDir, "owner", "repo", "skill");
      const mdContent = await readFile(join(skillDir, "SKILL.md"), "utf-8");
      expect(mdContent).toBe("# Skill Content");

      const metaContent = await readFile(join(skillDir, "meta.json"), "utf-8");
      expect(JSON.parse(metaContent)).toEqual(meta);
    });

    it("creates nested directories", async () => {
      const meta = makeMeta();
      await cacheSkill("deep/nested", "repo", "skill", "# Content", meta);

      const mdContent = await getCachedSkill("deep/nested", "repo", "skill");
      expect(mdContent).toBe("# Content");
    });

    it("overwrites existing cached skill", async () => {
      const meta1 = makeMeta({ installs: 100 });
      const meta2 = makeMeta({ installs: 200 });

      await cacheSkill("owner", "repo", "skill", "# v1", meta1);
      await cacheSkill("owner", "repo", "skill", "# v2", meta2);

      const content = await getCachedSkill("owner", "repo", "skill");
      expect(content).toBe("# v2");

      const metaResult = await getSkillMeta("owner", "repo", "skill");
      expect(metaResult!.installs).toBe(200);
    });
  });
});
