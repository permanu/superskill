import { chmod, link, lstat, mkdir, mkdtemp, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import type { LeakedTmpScan } from "./environment.js";
import { readTextBounded } from "./traces/source.js";

interface QuarantinedFile {
  name: string;
  original: string;
  bytes: number;
}

async function requireDirectory(path: string): Promise<void> {
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Unsafe quarantine directory");
}

function validateFile(file: QuarantinedFile, root: string): void {
  if (typeof file.name !== "string" || basename(file.name) !== file.name || !file.name.endsWith(".tmp") || file.original !== join(root, file.name)) {
    throw new Error("Unsafe quarantine manifest path");
  }
}

export async function quarantineTmpFiles(scan: LeakedTmpScan): Promise<string> {
  const root = resolve(scan.root);
  await requireDirectory(root);
  const files: QuarantinedFile[] = [];
  if (scan.files.length > 1000) throw new Error("Quarantine file limit exceeded");
  for (const file of scan.files) {
    const entry = { name: basename(file.path), original: file.path, bytes: file.bytes };
    validateFile(entry, root);
    const info = await lstat(entry.original);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error("Unsafe quarantine file");
    files.push(entry);
  }
  const base = join(root, "quarantine");
  await mkdir(base, { recursive: true, mode: 0o700 });
  await requireDirectory(base);
  await chmod(base, 0o700);
  const path = await mkdtemp(join(base, `${new Date().toISOString().replace(/[:.]/g, "-")}-`));
  await chmod(path, 0o700);
  await writeFile(join(path, "manifest.json"), JSON.stringify({
    createdAt: new Date().toISOString(), reason: "watchdog fix: leaked .tmp files", files,
    undo: "Restore only regular files to their exact original paths when those paths are absent. Never overwrite an existing file or follow symlinks. Entries are planned before moves; a failed run may leave some files at their original paths.",
  }, null, 2), { encoding: "utf-8", mode: 0o600, flag: "wx" });
  try {
    for (const file of files) {
      const info = await lstat(file.original);
      if (!info.isFile() || info.isSymbolicLink()) throw new Error("Unsafe quarantine file");
      await rename(file.original, join(path, file.name));
      await chmod(join(path, file.name), 0o600);
    }
  } catch (err) {
    throw new Error(`Quarantine incomplete; recovery manifest: ${join(path, "manifest.json")}`, { cause: err });
  }
  return path;
}

export async function restoreQuarantinedTmp(path: string, home = homedir()): Promise<number> {
  const root = resolve(home, ".superskill");
  const base = join(root, "quarantine");
  const directory = resolve(path);
  if (dirname(directory) !== base) throw new Error("Unsafe quarantine directory");
  for (const dir of [root, base, directory]) await requireDirectory(dir);
  const raw = await readTextBounded(join(directory, "manifest.json"), 1024 * 1024);
  if (!raw || raw.truncated) throw new Error("Invalid quarantine manifest");
  const parsed: unknown = JSON.parse(raw.text);
  const files = parsed && typeof parsed === "object" && "files" in parsed ? parsed.files : undefined;
  if (!Array.isArray(files) || files.length > 1000) throw new Error("Invalid quarantine manifest");
  for (const entry of files) {
    if (!entry || typeof entry !== "object") throw new Error("Invalid quarantine manifest");
    validateFile(entry as QuarantinedFile, root);
  }
  let restored = 0;
  for (const entry of files as QuarantinedFile[]) {
    const source = join(directory, entry.name);
    let info;
    try { info = await lstat(source); } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw err;
    }
    if (!info.isFile() || info.isSymbolicLink()) throw new Error("Unsafe quarantine file");
    await link(source, entry.original);
    await unlink(source);
    restored += 1;
  }
  return restored;
}
