import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { checkShippedSkills, discoverShippedSkillFiles, nativeValidatorArgs } from "./check-skill-authoring.mjs";

async function makeRepo() {
  const root = await mkdtemp(join(tmpdir(), "skill-authoring-gate-"));
  await mkdir(join(root, "skills", "demo"), { recursive: true });
  await writeFile(join(root, "skills", "demo", "SKILL.md"), "---\nname: demo\ndescription: Demo\n---\nBody.\n");
  return root;
}

function validResult(repoRoot, skillFile) {
  return {
    status: 0,
    stdout: JSON.stringify({
      success: true,
      valid: true,
      profile: "anthropic",
      counts: { errors: 0, warnings: 0 },
      checked_paths: [relative(repoRoot, skillFile).split("\\").join("/")],
    }),
    stderr: "",
  };
}

test("discovers only SKILL.md files under the shipped skills directory", async (t) => {
  const root = await makeRepo();
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "skills", "nested", "other"), { recursive: true });
  await writeFile(join(root, "skills", "nested", "other", "SKILL.md"), "native");
  await mkdir(join(root, "docs"), { recursive: true });
  await writeFile(join(root, "docs", "SKILL.md"), "not shipped");

  const files = await discoverShippedSkillFiles(root);

  assert.deepEqual(files.map((file) => relative(root, file).split("\\").join("/")), [
    "skills/demo/SKILL.md",
    "skills/nested/other/SKILL.md",
  ]);
});

test("fails closed when no shipped native skills are discovered", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "skill-authoring-empty-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  await assert.rejects(checkShippedSkills(root), /No shipped skills\/\*\*\/SKILL\.md files were discovered/);
});

test("uses the real CLI validator with the Anthropic profile for each shipped file", () => {
  assert.deepEqual(nativeValidatorArgs("/checkout/skills/demo/SKILL.md", "/checkout"), [
    "/checkout/dist/cli.js",
    "skill",
    "validate",
    "skills/demo/SKILL.md",
    "--profile",
    "anthropic",
  ]);
});

test("validates each discovered skill using the command report and checks the count", async (t) => {
  const root = await makeRepo();
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "skills", "second"), { recursive: true });
  await writeFile(join(root, "skills", "second", "SKILL.md"), "---\nname: second\ndescription: Demo\n---\nBody.\n");
  const calls = [];

  const result = await checkShippedSkills(root, (skillFile, repoRoot) => {
    calls.push({ skillFile, repoRoot });
    return validResult(repoRoot, skillFile);
  });

  assert.equal(result.checkedCount, 2);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.repoRoot === resolve(root)));
});

test("fails when native validation exits unsuccessfully", async (t) => {
  const root = await makeRepo();
  t.after(() => rm(root, { recursive: true, force: true }));

  await assert.rejects(
    checkShippedSkills(root, () => ({ status: 1, stdout: "", stderr: "invalid metadata" })),
    /Native validator failed.*invalid metadata/s,
  );
});

test("fails when validator output is invalid or omits the checked skill", async (t) => {
  const root = await makeRepo();
  t.after(() => rm(root, { recursive: true, force: true }));

  await assert.rejects(
    checkShippedSkills(root, () => ({ status: 0, stdout: "not json", stderr: "" })),
    /did not return JSON/,
  );
  await assert.rejects(
    checkShippedSkills(root, () => ({
      status: 0,
      stdout: JSON.stringify({ success: true, valid: true, profile: "anthropic", counts: { errors: 0 }, checked_paths: [] }),
      stderr: "",
    })),
    /did not report checking/,
  );
  await assert.rejects(
    checkShippedSkills(root, () => ({
      status: 0,
      stdout: JSON.stringify({ success: false, valid: false, profile: "anthropic", counts: { errors: 1 }, checked_paths: [] }),
      stderr: "",
    })),
    /rejected/,
  );
});

test("rejects a future shipped export with an Anthropic-reserved name", async (t) => {
  const root = await makeRepo();
  t.after(() => rm(root, { recursive: true, force: true }));
  const futureFile = join(root, "skills", "anthropic-helper", "SKILL.md");
  await mkdir(join(root, "skills", "anthropic-helper"), { recursive: true });
  await writeFile(futureFile, "---\nname: anthropic-helper\ndescription: Future skill\n---\nInstructions.\n");

  await assert.rejects(
    checkShippedSkills(root, (skillFile, repoRoot) => {
      if (skillFile === futureFile) {
        assert.equal(nativeValidatorArgs(skillFile, repoRoot).at(-1), "anthropic");
        return {
          status: 1,
          stdout: JSON.stringify({
            success: false,
            valid: false,
            profile: "anthropic",
            issues: [{ code: "name.reserved", field: "name", severity: "error" }],
            counts: { errors: 1, warnings: 0 },
            checked_paths: ["skills/anthropic-helper/SKILL.md"],
          }),
          stderr: "",
        };
      }
      return validResult(repoRoot, skillFile);
    }),
    /Native validator failed for skills\/anthropic-helper\/SKILL\.md.*name\.reserved/s,
  );
});

test("rejects symlinked skill directories during discovery", async (t) => {
  const root = await makeRepo();
  t.after(() => rm(root, { recursive: true, force: true }));
  const externalDir = await mkdtemp(join(tmpdir(), "skill-authoring-external-"));
  t.after(() => rm(externalDir, { recursive: true, force: true }));
  await writeFile(join(externalDir, "SKILL.md"), "not shipped");
  await symlink(externalDir, join(root, "skills", "linked"));

  await assert.rejects(discoverShippedSkillFiles(root), /cannot contain symlinks/);
});

test("rejects a symlinked skills root instead of scanning outside the repository", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "skill-authoring-root-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const externalSkills = await mkdtemp(join(tmpdir(), "skill-authoring-external-root-"));
  t.after(() => rm(externalSkills, { recursive: true, force: true }));
  await mkdir(join(externalSkills, "demo"));
  await writeFile(join(externalSkills, "demo", "SKILL.md"), "not in the checkout");
  await symlink(externalSkills, join(root, "skills"));

  await assert.rejects(discoverShippedSkillFiles(root), /skills root must be a real directory/);
});
