// SPDX-License-Identifier: Apache-2.0
import { mkdir, writeFile } from "fs/promises";
import { basename, dirname, relative, resolve } from "path";
import { VaultFS, assertSafeVaultContent } from "./vault-fs.js";

/**
 * Find the next auto-increment number for files in a directory.
 * Scans existing files matching NNN-*.md pattern.
 */
export async function getNextNumber(vaultFs: VaultFS, dirPath: string): Promise<number> {
  let nextNumber = 1;
  try {
    const files = await vaultFs.list(dirPath, 1);
    for (const file of files) {
      const match = basename(file).match(/^(?:(?:ticket|task)-)?(\d+)-/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNumber) nextNumber = num + 1;
      }
    }
  } catch (err: unknown) {
    if (!(err instanceof Error && "code" in err && err.code === "FILE_NOT_FOUND")) throw err;
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
  const claims = await claimNumberedBatch(vaultFs, dirPath, 1,
    (_index, number, padded) => buildFileName(number, padded),
    (_index, entries) => buildContent(entries[0].number, String(entries[0].number).padStart(3, "0")),
    options,
  );
  return claims[0];
}

export async function claimNumberedBatch(
  vaultFs: VaultFS,
  dirPath: string,
  count: number,
  buildFileName: (index: number, number: number, padded: string) => string,
  buildContent: (index: number, claims: readonly ClaimedFile[]) => string,
  options: ClaimNumberedOptions = {},
): Promise<ClaimedFile[]> {
  if (!Number.isSafeInteger(count) || count < 1) throw new Error("Batch count must be a positive integer");
  const maxAttempts = options.maxAttempts ?? 100;
  let number = Math.max(options.startAt ?? 1, await getNextNumber(vaultFs, dirPath));
  const claims: ClaimedFile[] = [];
  for (let index = 0; index < count; index++) {
    let reserved = false;
    for (let attempt = 0; attempt < maxAttempts; attempt++, number++) {
      const padded = String(number).padStart(3, "0");
      const path = `${dirPath}/${buildFileName(index, number, padded)}`;
      if (await vaultFs.exists(path)) continue;
      try {
        await writeExclusive(vaultFs, `${dirPath}/.number-claims/${padded}`, path);
        claims.push({ number, path });
        number++;
        reserved = true;
        break;
      } catch (e: any) {
        if (e?.code !== "EEXIST") throw e;
      }
    }
    if (!reserved) throw new Error(`Failed to claim a numbered file in ${dirPath} after ${maxAttempts} attempts`);
  }
  const contents = claims.map((_claim, index) => buildContent(index, claims));
  for (const content of contents) assertSafeVaultContent(content);
  for (let index = 0; index < claims.length; index++) await writeExclusive(vaultFs, claims[index].path, contents[index]);
  return claims;
}

async function writeExclusive(vaultFs: VaultFS, relativePath: string, content: string): Promise<void> {
  assertSafeVaultContent(content);
  const abs = resolve(vaultFs.root, vaultFs.jailPath(relativePath));
  const rel = relative(vaultFs.root, abs);
  if (rel.startsWith("..") || rel.startsWith("/") || rel === "") {
    throw new Error(`Path escapes vault: ${relativePath}`);
  }

  await vaultFs.verifyNoSymlinkEscape(relativePath);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content, { encoding: "utf-8", flag: "wx" });
}
