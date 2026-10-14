import { closeSync, constants, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir, tmpdir } from "node:os";
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";

export function assertSafeSetupPath(filePath: string): void {
  const path = resolve(filePath);
  const anchor = [homedir(), tmpdir()].map((root) => resolve(root)).find((root) => {
    const rel = relative(root, path);
    return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
  }) ?? parse(path).root;
  const parts = relative(anchor, path).split(sep);
  let current = anchor;
  for (let index = 0; index < parts.length; index += 1) {
    current = join(current, parts[index]);
    let info;
    try {
      info = lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    if (info.isSymbolicLink() || (index === parts.length - 1 ? !info.isFile() : !info.isDirectory())) {
      throw new Error(`[setup] Refusing symlink or non-regular path: ${filePath}`);
    }
  }
}

export function readSetupText(filePath: string): string | null {
  assertSafeSetupPath(filePath);
  try {
    const fd = openSync(filePath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      if (!fstatSync(fd).isFile()) throw new Error(`[setup] Refusing non-regular file: ${filePath}`);
      return readFileSync(fd, "utf-8");
    } finally {
      closeSync(fd);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function writeSetupText(filePath: string, content: string, expected = readSetupText(filePath)): void {
  assertSafeSetupPath(filePath);
  mkdirSync(dirname(filePath), { recursive: true, mode: 0o700 });
  assertSafeSetupPath(filePath);
  const temp = join(dirname(filePath), `.superskill-${randomUUID()}.tmp`);
  const fd = openSync(temp, "wx", 0o600);
  try {
    try {
      writeFileSync(fd, content, "utf-8");
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    if (readSetupText(filePath) !== expected) throw new Error(`[setup] ${filePath} changed during write; left unchanged`);
    renameSync(temp, filePath);
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
  }
}
