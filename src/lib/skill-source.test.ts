import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { catalogFile, catalogRoot } from "./catalog.js";

const home = vi.hoisted(() => ({ path: undefined as string | undefined }));
vi.mock("node:os", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:os")>();
  return { ...original, homedir: () => home.path ?? original.homedir() };
});

import { parseSkillId, resolveSkillSource } from "./skill-source.js";

describe("parseSkillId", () => {
  it("keeps dotted repository names and rejects traversal", () => {
    expect(parseSkillId("owner/repo.name@skill")).toEqual({
      source: "cache",
      owner: "owner",
      repo: "repo.name",
      name: "skill",
    });
    expect(parseSkillId("owner/../repo@skill")).toBeNull();
    expect(parseSkillId("native/../../outside")).toBeNull();
  });
});

describe("resolveSkillSource", () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), "skill-source-"));
    home.path = projectDir;
  });

  afterEach(async () => {
    home.path = undefined;
    await rm(projectDir, { recursive: true, force: true });
  });

  it("resolves nested native skills under the allowed project source root", async () => {
    const root = join(await realpath(projectDir), ".agents", "skills");
    const skillDir = join(root, "market", "repo", "nested");
    const file = join(skillDir, "SKILL.md");
    await mkdir(join(skillDir, "references"), { recursive: true });
    await writeFile(file, "# Native");
    await writeFile(join(skillDir, "references", "reference.md"), "Nested native reference");

    const source = await resolveSkillSource(projectDir, "native/nested");
    if (!source) throw new Error("Expected the nested native skill source to resolve");
    expect(source).toEqual({
      id: "native/nested",
      source: "native",
      file,
      baseDir: skillDir,
      allowedRoots: [root],
    });
    expect(await readFile(join(source.baseDir, "references", "reference.md"), "utf-8")).toBe("Nested native reference");
  });

  it("resolves a catalog skill only inside the catalog root", async () => {
    const file = catalogFile("pipeline/delivery");
    const root = await realpath(catalogRoot());

    const source = await resolveSkillSource(projectDir, "pipeline/delivery");
    expect(source).toEqual({
      id: "pipeline/delivery",
      source: "catalog",
      file,
      baseDir: dirname(file),
      allowedRoots: [root],
    });
  });

  it("resolves dotted cache repository names", async () => {
    const root = join(await realpath(projectDir), ".superskill", "skill-cache");
    const skillDir = join(root, "owner", "repo.name", "skill");
    const file = join(skillDir, "SKILL.md");
    await mkdir(join(skillDir, "references"), { recursive: true });
    await writeFile(file, "# Cached");
    await writeFile(join(skillDir, "references", "reference.md"), "Dotted cache reference");

    const source = await resolveSkillSource(projectDir, "owner/repo.name@skill");
    if (!source) throw new Error("Expected the dotted cache skill source to resolve");
    expect(source).toEqual({
      id: "owner/repo.name@skill",
      source: "cache",
      file,
      baseDir: skillDir,
      allowedRoots: [root],
    });
    expect(await readFile(join(source.baseDir, "references", "reference.md"), "utf-8")).toBe("Dotted cache reference");
  });

  it("permits explicit local cache links into the trusted global cache", async () => {
    const canonicalProjectDir = await realpath(projectDir);
    const globalRoot = join(canonicalProjectDir, ".superskill", "skills");
    const globalSkill = join(globalRoot, "owner", "repo", "shared");
    const localRoot = join(canonicalProjectDir, ".superskill", "skill-cache");
    await mkdir(globalSkill, { recursive: true });
    await writeFile(join(globalSkill, "SKILL.md"), "# Shared");
    await mkdir(join(localRoot, "owner", "repo"), { recursive: true });
    await symlink(globalSkill, join(localRoot, "owner", "repo", "shared"));

    const source = await resolveSkillSource(projectDir, "owner/repo@shared");
    expect(source).toEqual({
      id: "owner/repo@shared",
      source: "cache",
      file: join(globalSkill, "SKILL.md"),
      baseDir: globalSkill,
      allowedRoots: [localRoot, globalRoot],
    });
  });

  it.each([
    ["owner", "different-owner", "repo", "requested-skill"],
    ["repository", "owner", "different-repo", "requested-skill"],
    ["skill", "owner", "repo", "different-skill"],
  ])("rejects a local cache link with a different canonical %s identity", async (_kind, targetOwner, targetRepo, targetSkill) => {
    const projectRoot = await realpath(projectDir);
    const globalRoot = join(projectRoot, ".superskill", "skills");
    const localRoot = join(projectRoot, ".superskill", "skill-cache");
    const targetDir = join(globalRoot, targetOwner, targetRepo, targetSkill);
    const requestedDir = join(localRoot, "owner", "repo", "requested-skill");
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, "SKILL.md"), "# Wrong identity");
    await mkdir(dirname(requestedDir), { recursive: true });
    await symlink(targetDir, requestedDir);

    await expect(resolveSkillSource(projectDir, "owner/repo@requested-skill")).resolves.toBeNull();
  });

  it("rejects a cache SKILL.md link whose canonical target is a different file", async () => {
    const projectRoot = await realpath(projectDir);
    const globalRoot = join(projectRoot, ".superskill", "skills");
    const localRoot = join(projectRoot, ".superskill", "skill-cache");
    const targetDir = join(globalRoot, "owner", "repo", "requested-skill");
    const localSkillDir = join(localRoot, "owner", "repo", "requested-skill");
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, "README.md"), "# Not a skill entrypoint");
    await mkdir(localSkillDir, { recursive: true });
    await symlink(join(targetDir, "README.md"), join(localSkillDir, "SKILL.md"));

    await expect(resolveSkillSource(projectDir, "owner/repo@requested-skill")).resolves.toBeNull();
  });

  it("rejects invalid, missing, and escaping sources", async () => {
    const outside = join(projectDir, "outside");
    const root = join(await realpath(projectDir), ".agents", "skills");
    await mkdir(outside);
    await mkdir(root, { recursive: true });
    await writeFile(join(outside, "SKILL.md"), "# Outside");
    await symlink(outside, join(root, "escape"));

    await expect(resolveSkillSource(projectDir, "native/../../outside")).resolves.toBeNull();
    await expect(resolveSkillSource(projectDir, "native/missing")).resolves.toBeNull();
    await expect(resolveSkillSource(projectDir, "native/escape")).resolves.toBeNull();
    await expect(resolveSkillSource(projectDir, "owner/repo@missing")).resolves.toBeNull();
  });

  it("does not traverse beyond the native search depth", async () => {
    const root = join(await realpath(projectDir), ".agents", "skills");
    const file = join(root, "a", "b", "c", "d", "e", "f", "deep", "SKILL.md");
    await mkdir(join(root, "a", "b", "c", "d", "e", "f", "deep"), { recursive: true });
    await writeFile(file, "# Deep");

    await expect(resolveSkillSource(projectDir, "native/deep")).resolves.toBeNull();
  });
});
