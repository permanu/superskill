import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, realpath, rm, stat, symlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { searchStructured, searchText } from "./search-engine.js";
import { VaultFS } from "./vault-fs.js";

describe("VaultFS canonical personal-segment isolation", () => {
  let home: string;
  let root: string;
  let project: string;
  let originalHome: string | undefined;
  const privateContent = "---\ntype: private\n---\n\n# CANONICAL-PRIVATE-MARKER\n";
  const publicContent = "---\ntype: public\n---\n\n# CANONICAL-PUBLIC-MARKER\n";

  beforeEach(async () => {
    originalHome = process.env.HOME;
    home = await realpath(await mkdtemp(join(tmpdir(), "vault-personal-alias-")));
    process.env.HOME = home;
    root = join(home, "personal", "vault");
    project = join(root, "projects", "a");
    await mkdir(join(project, "PeRsOnAl"), { recursive: true });
    await mkdir(join(project, "nested", "personal"), { recursive: true });
    await mkdir(join(project, "notes"));
    await writeFile(join(project, "PeRsOnAl", "private.md"), privateContent);
    await writeFile(join(project, "nested", "personal", "private.md"), privateContent);
    await writeFile(join(project, "notes", "note.md"), publicContent);
    await symlink("PeRsOnAl", join(project, "public"));
    await symlink("public", join(project, "hop"));
    await symlink("PeRsOnAl/private.md", join(project, "exposed.md"));
    await symlink("nested/personal", join(project, "lower-public"));
    await symlink("notes", join(project, "safe"));
  });

  afterEach(async () => {
    await rm(home, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  it.each([
    [false, "read"], [false, "write"], [false, "delete"],
    [true, "read"], [true, "write"], [true, "delete"],
  ] as const)("denies direct and alias %s-scoped %s operations", async (scoped, operation) => {
    const vault = new VaultFS(root, scoped ? { projectSlug: "a" } : {});
    for (const relative of ["PeRsOnAl/private.md", "nested/personal/private.md", "public/private.md", "hop/private.md", "exposed.md", "lower-public/private.md"]) {
      const path = scoped ? relative : `projects/a/${relative}`;
      const result = operation === "read" ? vault.read(path) : operation === "write" ? vault.write(path, "replacement") : vault.delete(path);
      await expect(result).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    }
    expect(await readFile(join(project, "PeRsOnAl/private.md"), "utf-8")).toBe(privateContent);
    expect(await readFile(join(project, "nested/personal/private.md"), "utf-8")).toBe(privateContent);
  });

  it.each([false, true])("denies resolved personal ancestors before creating directories (scoped: %s)", async (scoped) => {
    const vault = new VaultFS(root, scoped ? { projectSlug: "a" } : {});
    const path = scoped ? "public/fresh/deep/note.md" : "projects/a/public/fresh/deep/note.md";
    await expect(vault.verifyNoSymlinkEscape(path)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(vault.write(path, "replacement")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(vault.createExclusive(path, "replacement")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(stat(join(project, "PeRsOnAl/fresh"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each([false, true])("checks dangling absolute targets when the vault root is symlinked (scoped: %s)", async (scoped) => {
    await symlink(join(project, "PeRsOnAl", "not-created"), join(project, "dangling"));
    const linkedRoot = join(home, "vault-link");
    await symlink(root, linkedRoot);
    const vault = new VaultFS(linkedRoot, scoped ? { projectSlug: "a" } : {});
    const path = scoped ? "dangling/note.md" : "projects/a/dangling/note.md";
    await expect(vault.verifyNoSymlinkEscape(path)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(vault.write(path, "replacement")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it.each([false, true])("preserves safe in-project aliases and exact-segment matching (scoped: %s)", async (scoped) => {
    const vault = new VaultFS(root, scoped ? { projectSlug: "a" } : {});
    const prefix = scoped ? "" : "projects/a/";
    expect(await vault.read(`${prefix}safe/note.md`)).toBe(publicContent);
    await vault.write(`${prefix}safe/new.md`, "allowed");
    expect(await vault.read(`${prefix}notes/new.md`)).toBe("allowed");
    await vault.delete(`${prefix}safe/new.md`);
    expect(await vault.exists(`${prefix}notes/new.md`)).toBe(false);
    for (const directory of ["personalized", "my-personal", "personal-notes"]) {
      await mkdir(join(project, directory));
      await symlink(directory, join(project, `alias-${directory}`));
      await vault.write(`${prefix}alias-${directory}/allowed.md`, "allowed");
      expect(await vault.read(`${prefix}alias-${directory}/allowed.md`)).toBe("allowed");
    }
  });

  it("does not reject personal components belonging to the vault root itself", async () => {
    const namedRoot = join(home, "other", "personal");
    const vault = new VaultFS(namedRoot, { projectSlug: "a" });
    await vault.write("note.md", "allowed");
    expect(await vault.read("note.md")).toBe("allowed");
  });

  it("also rejects unscoped aliases to vault-global personal files", async () => {
    await mkdir(join(root, "personal"));
    await writeFile(join(root, "personal", "private.md"), privateContent);
    await symlink("personal", join(root, "public"));
    const vault = new VaultFS(root);
    await expect(vault.read("public/private.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(vault.write("public/private.md", "replacement")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(vault.delete("public/private.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    expect(await readFile(join(root, "personal", "private.md"), "utf-8")).toBe(privateContent);
  });

  it.each([
    ["text", "projects/a/public"], ["text", "projects/a/public/private.md"],
    ["structured", "projects/a/public"], ["structured", "projects/a/public/private.md"],
  ] as const)("denies explicit personal aliases in %s search at %s", async (mode, pathFilter) => {
    const result = mode === "text"
      ? searchText(root, "CANONICAL-PRIVATE-MARKER", { pathFilter })
      : searchStructured(root, { type: "private" }, { pathFilter });
    await expect(result).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it.each(["text", "structured"] as const)("keeps safe aliases searchable in %s mode", async (mode) => {
    const results = mode === "text"
      ? await searchText(root, "CANONICAL-PUBLIC-MARKER", { pathFilter: "projects/a/safe/note.md" })
      : await searchStructured(root, { type: "public" }, { pathFilter: "projects/a/safe/note.md" });
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe("projects/a/safe/note.md");
  });

  it.each(["text", "structured"] as const)("does not return personal markers in unfiltered %s search", async (mode) => {
    const results = mode === "text"
      ? await searchText(root, "CANONICAL-PRIVATE-MARKER")
      : await searchStructured(root, { type: "private" });
    expect(results).toEqual([]);
  });
});
