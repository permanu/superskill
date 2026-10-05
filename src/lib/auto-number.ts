// SPDX-License-Identifier: Apache-2.0
import { mkdir, writeFile } from "fs/promises";
import { dirname, relative, resolve } from "path";
import { VaultFS } from "./vault-fs.js";

/**
 * Find the next auto-increment number for files in a directory.
 * Scans existing files matching NNN-*.md pattern.
 */
export async function getNextNumber(vaultFs: VaultFS, dirPath: string): Promise<number> {
  let nextNumber = 1;
  try {
    const files = await vaultFs.list(dirPath, 1);
    for (const file of files) {
      const match = file.match(/(\d+)-/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNumber) nextNumber = num + 1;
      }
    }
  } catch {
    // Directory doesn't exist yet, start at 1
  }
  return nextNumber;
}

/**
 * Generate a filename slug from a title.
 */
export function slugify(title: string): string {
  const result = title
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-|-$/g, "");
  return result || "untitled";
}

export interface ClaimedFile {
  number: number;
  path: string;
}

export interface ClaimNumberedOptions {
  startAt?: number;
  maxAttempts?: number;
}

/**
 * Exclusively create the next numbered file in a directory.
 * Retries with the next number when a concurrent writer wins the race.
 */
export async function claimNumberedFile(
  vaultFs: VaultFS,
  dirPath: string,
  buildFileName: (number: number, padded: string) => string,
  buildContent: (number: number, padded: string) => string,
  options: ClaimNumberedOptions = {},
): Promise<ClaimedFile> {
  const maxAttempts = options.maxAttempts ?? 100;
  let number = options.startAt ?? (await getNextNumber(vaultFs, dirPath));

  for (let attempt = 0; attempt < maxAttempts; attempt++, number++) {
    const padded = String(number).padStart(3, "0");
    const filePath = `${dirPath}/${buildFileName(number, padded)}`;
    try {
      await writeExclusive(vaultFs, filePath, buildContent(number, padded));
      return { number, path: filePath };
    } catch (e: any) {
      if (e?.code !== "EEXIST") throw e;
    }
  }

  throw new Error(`Failed to claim a numbered file in ${dirPath} after ${maxAttempts} attempts`);
}

async function writeExclusive(vaultFs: VaultFS, relativePath: string, content: string): Promise<void> {
  const abs = resolve(vaultFs.root, vaultFs.jailPath(relativePath));
  const rel = relative(vaultFs.root, abs);
  if (rel.startsWith("..") || rel.startsWith("/") || rel === "") {
    throw new Error(`Path escapes vault: ${relativePath}`);
  }

  await vaultFs.verifyNoSymlinkEscape(relativePath);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content, { encoding: "utf-8", flag: "wx" });
}
