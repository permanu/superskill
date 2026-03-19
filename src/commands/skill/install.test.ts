import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { VaultFS } from "../../lib/vault-fs.js";
import { SkillRegistryManager } from "../../lib/skill-registry.js";
import { installSkill, deleteSkill, InstallResult } from "./install.js";

describe("installSkill", () => {
  let vaultRoot: string;
  let vaultFs: VaultFS;
  let registryManager: SkillRegistryManager;

  const validSkillContent = `---
name: test-skill
description: A test skill for unit tests
version: "1.0.0"
author: test-author
tags:
  - test
  - example
---

# Test Skill

This is the body of the test skill.
`;

  const missingNameContent = `---
description: Missing name field
---

# Skill without name
`;

  const missingDescContent = `---
name: no-desc-skill
---

# Skill without description
`;

  const emptyFrontmatter = `---
---

# Empty frontmatter
`;

  beforeEach(async () => {
    vaultRoot = join(homedir(), `.vault-skill-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(vaultRoot, { recursive: true });
    vaultFs = new VaultFS(vaultRoot);
    registryManager = new SkillRegistryManager(vaultRoot);
  });

  afterEach(async () => {
    await rm(vaultRoot, { recursive: true, force: true });
  });

  describe("install from local file", () => {
    it("installs a valid skill from local file", async () => {
      const skillPath = join(vaultRoot, "source", "test-skill.md");
      await mkdir(join(vaultRoot, "source"), { recursive: true });
      await writeFile(skillPath, validSkillContent);

      const result = await installSkill(vaultFs, registryManager, {
        source: skillPath,
      });

      expect(result.success).toBe(true);
      expect(result.skill).toBeDefined();
      expect(result.skill?.name).toBe("test-skill");
      expect(result.skill?.source).toBe("local");
      expect(result.skill?.source_path).toBe(skillPath);
      expect(result.skill?.version).toBe("1.0.0");
      expect(result.skill?.status).toBe("active");
      expect(result.skill?.auto_update).toBe(false);
    });

    it("fails when source file does not exist", async () => {
      const result = await installSkill(vaultFs, registryManager, {
        source: "/nonexistent/path/skill.md",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to read source");
    });

    it("fails when frontmatter is missing required name field", async () => {
      const skillPath = join(vaultRoot, "source", "invalid.md");
      await mkdir(join(vaultRoot, "source"), { recursive: true });
      await writeFile(skillPath, missingNameContent);

      const result = await installSkill(vaultFs, registryManager, {
        source: skillPath,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid skill frontmatter");
    });

    it("fails when frontmatter is missing required description field", async () => {
      const skillPath = join(vaultRoot, "source", "no-desc.md");
      await mkdir(join(vaultRoot, "source"), { recursive: true });
      await writeFile(skillPath, missingDescContent);

      const result = await installSkill(vaultFs, registryManager, {
        source: skillPath,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid skill frontmatter");
    });

    it("fails when frontmatter is empty", async () => {
      const skillPath = join(vaultRoot, "source", "empty.md");
      await mkdir(join(vaultRoot, "source"), { recursive: true });
      await writeFile(skillPath, emptyFrontmatter);

      const result = await installSkill(vaultFs, registryManager, {
        source: skillPath,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid skill frontmatter");
    });

    it("fails when skill already installed without force", async () => {
      const skillPath = join(vaultRoot, "source", "test-skill.md");
      await mkdir(join(vaultRoot, "source"), { recursive: true });
      await writeFile(skillPath, validSkillContent);

      const result1 = await installSkill(vaultFs, registryManager, {
        source: skillPath,
      });
      expect(result1.success).toBe(true);

      const result2 = await installSkill(vaultFs, registryManager, {
        source: skillPath,
      });
      expect(result2.success).toBe(false);
      expect(result2.error).toContain("already installed");
    });

    it("overwrites existing skill with force flag", async () => {
      const skillPath = join(vaultRoot, "source", "test-skill.md");
      await mkdir(join(vaultRoot, "source"), { recursive: true });
      await writeFile(skillPath, validSkillContent);

      const result1 = await installSkill(vaultFs, registryManager, {
        source: skillPath,
      });
      expect(result1.success).toBe(true);

      const result2 = await installSkill(vaultFs, registryManager, {
        source: skillPath,
        force: true,
      });
      expect(result2.success).toBe(true);
      expect(result2.skill?.updated_at).not.toBe(result1.skill?.updated_at);
    });

    it("uses default version when not specified", async () => {
      const noVersionContent = `---
name: no-version-skill
description: Skill without version
---
# Content
`;
      const skillPath = join(vaultRoot, "source", "no-version.md");
      await mkdir(join(vaultRoot, "source"), { recursive: true });
      await writeFile(skillPath, noVersionContent);

      const result = await installSkill(vaultFs, registryManager, {
        source: skillPath,
      });

      expect(result.success).toBe(true);
      expect(result.skill?.version).toBe("0.0.0");
    });

    it("preserves depends_on from frontmatter", async () => {
      const withDepsContent = `---
name: skill-with-deps
description: Skill with dependencies
depends_on:
  - base-skill
  - utils-skill
---
# Content
`;
      const skillPath = join(vaultRoot, "source", "with-deps.md");
      await mkdir(join(vaultRoot, "source"), { recursive: true });
      await writeFile(skillPath, withDepsContent);

      const result = await installSkill(vaultFs, registryManager, {
        source: skillPath,
      });

      expect(result.success).toBe(true);
      expect(result.skill?.depends_on).toEqual(["base-skill", "utils-skill"]);
    });
  });

  describe("deleteSkill", () => {
    it("deletes an installed skill", async () => {
      const skillPath = join(vaultRoot, "source", "test-skill.md");
      await mkdir(join(vaultRoot, "source"), { recursive: true });
      await writeFile(skillPath, validSkillContent);

      const installResult = await installSkill(vaultFs, registryManager, {
        source: skillPath,
      });
      expect(installResult.success).toBe(true);

      const deleteResult = await deleteSkill(vaultFs, registryManager, "test-skill");
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.skill?.name).toBe("test-skill");

      const registry = await registryManager.read();
      expect(registry.skills.find(s => s.name === "test-skill")).toBeUndefined();
    });

    it("fails when skill not found", async () => {
      const result = await deleteSkill(vaultFs, registryManager, "nonexistent-skill");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found in registry");
    });

    it("returns the deleted skill info", async () => {
      const skillPath = join(vaultRoot, "source", "test-skill.md");
      await mkdir(join(vaultRoot, "source"), { recursive: true });
      await writeFile(skillPath, validSkillContent);

      await installSkill(vaultFs, registryManager, { source: skillPath });
      const result = await deleteSkill(vaultFs, registryManager, "test-skill");

      expect(result.success).toBe(true);
      expect(result.skill?.name).toBe("test-skill");
      expect(result.skill?.version).toBe("1.0.0");
    });
  });

  describe("registry operations", () => {
    it("lists installed skills", async () => {
      const skillPath = join(vaultRoot, "source", "test-skill.md");
      await mkdir(join(vaultRoot, "source"), { recursive: true });
      await writeFile(skillPath, validSkillContent);

      await installSkill(vaultFs, registryManager, { source: skillPath });

      const skills = await registryManager.list();
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe("test-skill");
    });

    it("gets specific skill by name", async () => {
      const skillPath = join(vaultRoot, "source", "test-skill.md");
      await mkdir(join(vaultRoot, "source"), { recursive: true });
      await writeFile(skillPath, validSkillContent);

      await installSkill(vaultFs, registryManager, { source: skillPath });

      const skill = await registryManager.get("test-skill");
      expect(skill).toBeDefined();
      expect(skill?.name).toBe("test-skill");

      const missing = await registryManager.get("nonexistent");
      expect(missing).toBeUndefined();
    });
  });
});
