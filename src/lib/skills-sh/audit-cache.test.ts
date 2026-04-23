import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  setAuditCacheDir,
  ensureAuditDir,
  isStale,
  getAudit,
  setAudit,
  refreshAudit,
} from "./audit-cache.js";
import type { CachedAudit } from "./audit-cache.js";

vi.mock("./client.js", () => ({
  fetchSkillPage: vi.fn(),
}));

import { fetchSkillPage } from "./client.js";

const mockedFetchSkillPage = vi.mocked(fetchSkillPage);

describe("audit-cache", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(
      tmpdir(),
      `audit-cache-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(testDir, { recursive: true });
    setAuditCacheDir(testDir);
  });

  afterEach(async () => {
    setAuditCacheDir(null);
    await rm(testDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  function makeCachedAudit(
    overrides?: Partial<CachedAudit>,
  ): CachedAudit {
    return {
      gen: "pass",
      socket: "pass",
      snyk: "warn",
      fetched_at: Date.now(),
      skill_id: "owner/repo@skill",
      ...overrides,
    };
  }

  describe("ensureAuditDir", () => {
    it("creates the audit directory", async () => {
      const dir = await ensureAuditDir();
      expect(dir).toBe(testDir);
    });

    it("returns existing directory without error", async () => {
      await ensureAuditDir();
      const dir = await ensureAuditDir();
      expect(dir).toBe(testDir);
    });
  });

  describe("isStale", () => {
    it("returns false for fresh data", () => {
      const data = makeCachedAudit({ fetched_at: Date.now() });
      expect(isStale(data)).toBe(false);
    });

    it("returns true for data older than 24h", () => {
      const data = makeCachedAudit({
        fetched_at: Date.now() - 86_400_001,
      });
      expect(isStale(data)).toBe(true);
    });

    it("uses custom maxAgeMs", () => {
      const data = makeCachedAudit({ fetched_at: Date.now() - 5000 });
      expect(isStale(data, 3000)).toBe(true);
      expect(isStale(data, 10000)).toBe(false);
    });
  });

  describe("getAudit", () => {
    it("returns null for missing audit file", async () => {
      const result = await getAudit("owner/repo@skill");
      expect(result).toBeNull();
    });

    it("reads and parses cached audit", async () => {
      const data = makeCachedAudit();
      const filePath = join(testDir, "owner", "repo", "skill.json");
      await mkdir(join(testDir, "owner", "repo"), { recursive: true });
      await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");

      const result = await getAudit("owner/repo@skill");
      expect(result).toEqual(data);
    });
  });

  describe("setAudit", () => {
    it("writes audit data atomically", async () => {
      const data = makeCachedAudit();
      await setAudit("owner/repo@skill", data);

      const filePath = join(testDir, "owner", "repo", "skill.json");
      const raw = await readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw) as CachedAudit;
      expect(parsed).toEqual(data);
    });

    it("creates nested directories", async () => {
      const data = makeCachedAudit();
      await setAudit("deep/nested/repo@skill", data);

      const filePath = join(testDir, "deep", "nested", "repo", "skill.json");
      const raw = await readFile(filePath, "utf-8");
      expect(JSON.parse(raw)).toEqual(data);
    });
  });

  describe("refreshAudit", () => {
    it("fetches from skills.sh and caches the result", async () => {
      mockedFetchSkillPage.mockResolvedValueOnce({
        name: "skill",
        owner: "owner",
        repo: "repo",
        skill: "skill",
        installs: 1000,
        stars: 100,
        audits: { gen: "pass", socket: "warn", snyk: "fail" },
        skillMd: "# content",
      });

      const result = await refreshAudit("owner/repo@skill");
      expect(result).not.toBeNull();
      expect(result!.gen).toBe("pass");
      expect(result!.socket).toBe("warn");
      expect(result!.snyk).toBe("fail");
      expect(result!.skill_id).toBe("owner/repo@skill");
      expect(typeof result!.fetched_at).toBe("number");

      const cached = await getAudit("owner/repo@skill");
      expect(cached).toEqual(result);
    });

    it("returns null when fetchSkillPage returns null", async () => {
      mockedFetchSkillPage.mockResolvedValueOnce(null);

      const result = await refreshAudit("owner/repo@skill");
      expect(result).toBeNull();
    });

    it("returns null for invalid skill ID format", async () => {
      const result = await refreshAudit("invalid-format");
      expect(result).toBeNull();
    });
  });
});


