import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readFile, stat } from "fs/promises";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { claimNumberedBatch, claimNumberedFile, getNextNumber, slugify } from "./auto-number.js";
import { VaultFS } from "./vault-fs.js";

describe("auto-number", () => {
  let vaultRoot: string;
  let vaultFs: VaultFS;
  let testHome: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    originalHome = process.env.HOME;
    testHome = join(tmpdir(), `autonumber-home-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testHome, { recursive: true });
    process.env.HOME = testHome;
    vaultRoot = join(tmpdir(), `autonumber-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(vaultRoot, { recursive: true });
    vaultFs = new VaultFS(vaultRoot);
  });

  afterEach(async () => {
    await rm(vaultRoot, { recursive: true, force: true });
    await rm(testHome, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  describe("getNextNumber", () => {
    it.each(["9007199254740991", "9007199254740992"])("fails closed instead of reusing an exhausted or unsafe number %s", async (number) => {
      await vaultFs.write(`exhausted/${number}-user.md`, "user work");
      await expect(getNextNumber(vaultFs, "exhausted")).rejects.toThrow("safe integer");
      expect(await vaultFs.read(`exhausted/${number}-user.md`)).toBe("user work");
    });
    it("counts permanent reservations without deleting or reusing them", async () => {
      await vaultFs.write("reserved/.number-claims/001", "reserved/001-first.md");
      await vaultFs.write("reserved/.number-claims/120", "reserved/120-last.md");
      expect(await getNextNumber(vaultFs, "reserved")).toBe(121);
      const claim = await claimNumberedFile(vaultFs, "reserved", (_number, padded) => `${padded}-new.md`, () => "new");
      expect(claim.number).toBe(121);
      expect(await vaultFs.read("reserved/.number-claims/001")).toBe("reserved/001-first.md");
      expect(await vaultFs.read("reserved/.number-claims/120")).toBe("reserved/120-last.md");
    });
    it("returns 1 for empty directory", async () => {
      await mkdir(join(vaultRoot, "empty"), { recursive: true });
      const result = await getNextNumber(vaultFs, "empty");
      expect(result).toBe(1);
    });

    it("returns 1 for non-existent directory", async () => {
      const result = await getNextNumber(vaultFs, "nonexistent");
      expect(result).toBe(1);
    });

    it("returns next number after existing files", async () => {
      await vaultFs.write("decisions/.keep", "");
      await vaultFs.write("decisions/001-first.md", "");
      await vaultFs.write("decisions/002-second.md", "");
      
      const result = await getNextNumber(vaultFs, "decisions");
      expect(result).toBe(3);
    });

    it("handles gaps in numbering", async () => {
      await vaultFs.write("tasks/.keep", "");
      await vaultFs.write("tasks/001-first.md", "");
      await vaultFs.write("tasks/005-fifth.md", "");
      
      const result = await getNextNumber(vaultFs, "tasks");
      expect(result).toBe(6);
    });

    it("ignores files without number prefix", async () => {
      await vaultFs.write("mixed/.keep", "");
      await vaultFs.write("mixed/001-numbered.md", "");
      await vaultFs.write("mixed/unnumbered.md", "");
      await vaultFs.write("mixed/README.md", "");
      
      const result = await getNextNumber(vaultFs, "mixed");
      expect(result).toBe(2);
    });

    it("handles single digit numbers", async () => {
      await vaultFs.write("single/.keep", "");
      await vaultFs.write("single/1-first.md", "");
      await vaultFs.write("single/5-fifth.md", "");
      
      const result = await getNextNumber(vaultFs, "single");
      expect(result).toBe(6);
    });

    it("handles three digit numbers", async () => {
      await vaultFs.write("triple/.keep", "");
      await vaultFs.write("triple/099-late.md", "");
      await vaultFs.write("triple/100-hundred.md", "");
      
      const result = await getNextNumber(vaultFs, "triple");
      expect(result).toBe(101);
    });
  });

  describe("claimNumberedFile", () => {
    it.each([NaN, Infinity, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])("rejects unsafe start numbers before reserving files: %s", async (startAt) => {
      await expect(claimNumberedFile(vaultFs, "invalid", (_number, padded) => `${padded}-file.md`, () => "new", { startAt })).rejects.toThrow("positive safe integer");
      expect(await vaultFs.exists("invalid")).toBe(false);
    });

    it.each([NaN, Infinity, 0, -1, 1.5])("rejects invalid attempt bounds before reserving files: %s", async (maxAttempts) => {
      await expect(claimNumberedFile(vaultFs, "invalid", (_number, padded) => `${padded}-file.md`, () => "new", { maxAttempts })).rejects.toThrow("positive safe integer");
      expect(await vaultFs.exists("invalid")).toBe(false);
    });

    it("creates private audited files and permanent claim markers through VaultFS", async () => {
      const scoped = new VaultFS(vaultRoot, { projectSlug: "alpha" });
      const claim = await claimNumberedFile(scoped, "claims", (_number, padded) => `${padded}-first.md`, () => "safe");
      expect((await stat(join(vaultRoot, "projects/alpha", claim.path))).mode & 0o777).toBe(0o600);
      expect((await stat(join(vaultRoot, "projects/alpha/claims/.number-claims/001"))).mode & 0o777).toBe(0o600);
      expect((await stat(join(vaultRoot, "projects/alpha/claims/.number-claims"))).mode & 0o777).toBe(0o700);
      const entries = (await readFile(join(testHome, ".superskill/audit/vault-writes.jsonl"), "utf-8")).trim().split("\n").map((line) => JSON.parse(line));
      expect(entries).toEqual([
        expect.objectContaining({ op: "create", path: "claims/.number-claims/001", projectSlug: "alpha" }),
        expect.objectContaining({ op: "create", path: claim.path, projectSlug: "alpha" }),
      ]);
    });

    it("retains reservations after builder failures without removing existing work", async () => {
      await vaultFs.write("claims/001-user.md", "user work");
      await expect(claimNumberedFile(vaultFs, "claims", (_number, padded) => `${padded}-failed.md`, () => { throw new Error("builder failed"); })).rejects.toThrow("builder failed");
      expect(await vaultFs.read("claims/001-user.md")).toBe("user work");
      expect(await vaultFs.read("claims/.number-claims/002")).toBe("claims/002-failed.md");
      const claim = await claimNumberedFile(vaultFs, "claims", (_number, padded) => `${padded}-next.md`, () => "next");
      expect(claim.number).toBe(3);
    });

    it("prechecks all batch contents before publishing and retains rejected reservations", async () => {
      await expect(claimNumberedBatch(vaultFs, "claims", 2, (_index, _number, padded) => `${padded}-batch.md`, (index) => index === 0 ? "safe" : `ghp_${"A".repeat(36)}`)).rejects.toMatchObject({ code: "SECRET_REJECTED" });
      expect(await vaultFs.exists("claims/001-batch.md")).toBe(false);
      expect(await vaultFs.exists("claims/002-batch.md")).toBe(false);
      expect(await getNextNumber(vaultFs, "claims")).toBe(3);
      expect(await vaultFs.read("claims/.number-claims/001")).toBe("claims/001-batch.md");
      expect(await vaultFs.read("claims/.number-claims/002")).toBe("claims/002-batch.md");
    });

    it("does not remove a competing user file after a reservation", async () => {
      await expect(claimNumberedFile(vaultFs, "claims", (_number, padded) => `${padded}-user.md`, () => {
        writeFileSync(join(vaultRoot, "claims/001-user.md"), "user work");
        return "new";
      })).rejects.toMatchObject({ code: "EEXIST" });
      expect(await vaultFs.read("claims/001-user.md")).toBe("user work");
      expect(await vaultFs.read("claims/.number-claims/001")).toBe("claims/001-user.md");
      const claim = await claimNumberedFile(vaultFs, "claims", (_number, padded) => `${padded}-user.md`, () => "next");
      expect(claim.number).toBe(2);
      expect(await vaultFs.read("claims/001-user.md")).toBe("user work");
    });
    it("reserves numbers across concurrent different titles", async () => {
      const claims = await Promise.all(["alpha", "beta", "gamma"].map((slug) =>
        claimNumberedFile(vaultFs, "projects/project-123/tasks", (_number, padded) => `${padded}-${slug}.md`, () => slug, { startAt: 1 }),
      ));
      expect(claims.map((claim) => claim.number).sort((a, b) => a - b)).toEqual([1, 2, 3]);
      expect(await getNextNumber(vaultFs, "projects/project-123/tasks")).toBe(4);
    });

    it("does not reuse an existing number with a different title", async () => {
      await vaultFs.write("claims/001-old.md", "old");
      const claim = await claimNumberedFile(vaultFs, "claims", (_number, padded) => `${padded}-new.md`, () => "new", { startAt: 1 });
      expect(claim.number).toBe(2);
      expect(await vaultFs.read("claims/001-old.md")).toBe("old");
    });

    it("exclusively creates the first numbered file", async () => {
      await mkdir(join(vaultRoot, "claims"), { recursive: true });

      const claim = await claimNumberedFile(
        vaultFs,
        "claims",
        (_number, padded) => `${padded}-first.md`,
        (number) => `content-${number}`,
      );

      expect(claim.number).toBe(1);
      expect(claim.path).toBe("claims/001-first.md");
      expect(await vaultFs.read(claim.path)).toBe("content-1");
    });

    it("increments past an existing file on EEXIST", async () => {
      await vaultFs.write("retry/001-here.md", "taken");

      const claim = await claimNumberedFile(
        vaultFs,
        "retry",
        (_number, padded) => `${padded}-here.md`,
        () => "new",
        { startAt: 1 },
      );

      expect(claim.number).toBe(2);
      expect(claim.path).toBe("retry/002-here.md");
      expect(await vaultFs.read("retry/001-here.md")).toBe("taken");
      expect(await vaultFs.read("retry/002-here.md")).toBe("new");
    });

    it("gives concurrent claims distinct numbers", async () => {
      await mkdir(join(vaultRoot, "race"), { recursive: true });

      const [a, b] = await Promise.all([
        claimNumberedFile(vaultFs, "race", (_number, padded) => `${padded}-same.md`, (number) => `a-${number}`),
        claimNumberedFile(vaultFs, "race", (_number, padded) => `${padded}-same.md`, (number) => `b-${number}`),
      ]);

      expect([a.number, b.number].sort((x, y) => x - y)).toEqual([1, 2]);
      expect(a.path).not.toBe(b.path);
      expect(await vaultFs.read("race/001-same.md")).toBeDefined();
      expect(await vaultFs.read("race/002-same.md")).toBeDefined();
    });
  });

  describe("slugify", () => {
    const cases = [
      { name: "simple title", input: "Hello World", expected: "hello-world" },
      { name: "spaces become dashes", input: "multiple   spaces", expected: "multiple-spaces" },
      { name: "special chars removed", input: "Hello! @World# $Test%", expected: "hello-world-test" },
      { name: "uppercase to lowercase", input: "UPPERCASE TITLE", expected: "uppercase-title" },
      { name: "mixed case", input: "MixedCase Title", expected: "mixedcase-title" },
      { name: "numbers preserved", input: "Task 123 Test", expected: "task-123-test" },
      { name: "dashes at start removed", input: "-start with dash", expected: "start-with-dash" },
      { name: "dashes at end removed", input: "end with dash-", expected: "end-with-dash" },
      { name: "multiple dashes collapsed", input: "a---b", expected: "a-b" },
      { name: "empty string", input: "", expected: "untitled" },
      { name: "only special chars", input: "!@#$%", expected: "untitled" },
      { name: "underscore preserved", input: "hello_world", expected: "hello_world" },
      { name: "dots removed", input: "file.name.md", expected: "file-name-md" },
    ];

    for (const c of cases) {
      it(c.name, () => {
        expect(slugify(c.input)).toBe(c.expected);
      });
    }
  });
});
