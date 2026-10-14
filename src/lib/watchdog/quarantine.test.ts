import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanLeakedTmpFiles } from "./environment.js";
import { quarantineTmpFiles, restoreQuarantinedTmp } from "./quarantine.js";

let home: string;
beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "watchdog-quarantine-"));
  await mkdir(join(home, ".superskill"));
  await writeFile(join(home, ".superskill", "state.tmp"), "private state");
});
afterEach(async () => { await rm(home, { recursive: true, force: true }); });

it("quarantines privately with a prewritten manifest and restores without overwriting", async () => {
  const path = await quarantineTmpFiles(await scanLeakedTmpFiles(home));
  expect((await stat(path)).mode & 0o777).toBe(0o700);
  expect((await stat(join(path, ".."))).mode & 0o777).toBe(0o700);
  expect((await stat(join(path, "manifest.json"))).mode & 0o777).toBe(0o600);
  expect((await stat(join(path, "state.tmp"))).mode & 0o777).toBe(0o600);
  const original = join(home, ".superskill", "state.tmp");
  await writeFile(original, "new data");
  await expect(restoreQuarantinedTmp(path, home)).rejects.toThrow();
  expect(await readFile(original, "utf-8")).toBe("new data");
  expect(await readFile(join(path, "state.tmp"), "utf-8")).toBe("private state");
  await rm(original);
  expect(await restoreQuarantinedTmp(path, home)).toBe(1);
  expect(await readFile(original, "utf-8")).toBe("private state");
});

it("rejects manipulated manifest origins and symlinked quarantine roots", async () => {
  const path = await quarantineTmpFiles(await scanLeakedTmpFiles(home));
  const manifestPath = join(path, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
  manifest.files[0].original = join(home, "outside.tmp");
  await writeFile(manifestPath, JSON.stringify(manifest));
  await expect(restoreQuarantinedTmp(path, home)).rejects.toThrow(/manifest/);
  await expect(stat(join(home, "outside.tmp"))).rejects.toMatchObject({ code: "ENOENT" });
  const link = join(home, ".superskill", "quarantine", "linked");
  await symlink(path, link);
  await expect(restoreQuarantinedTmp(link, home)).rejects.toThrow(/directory/);
});

it("does not quarantine symlinks or write outside the superskill root", async () => {
  const root = join(home, ".superskill");
  const outside = join(home, "outside.tmp");
  await writeFile(outside, "do not move");
  await symlink(outside, join(root, "linked.tmp"));
  await expect(quarantineTmpFiles({ root, files: [{ path: join(root, "linked.tmp"), bytes: 1 }], totalBytes: 1 })).rejects.toThrow(/file/);
  await expect(quarantineTmpFiles({ root, files: [{ path: outside, bytes: 1 }], totalBytes: 1 })).rejects.toThrow(/path/);
  expect(await readFile(outside, "utf-8")).toBe("do not move");
});
