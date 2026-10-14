// SPDX-License-Identifier: Apache-2.0

import { lstat, open, readdir, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "./markdown-matter.js";
import { createRequire } from "node:module";
import type { SkillPack } from "./graph/schema.js";

export const packagedCatalogVersion: string = createRequire(import.meta.url)("../../package.json").version;
export const MAX_SKILL_FILE_BYTES = 1024 * 1024;

const PACKS: ReadonlySet<string> = new Set([
  "memory", "code", "review", "security", "ops", "devops", "optimizer", "pipeline", "watchdog", "ui",
]);

export interface CatalogSkill {
  id: string;
  name: string;
  pack: SkillPack;
  langs: string[];
  triggers: string[];
  always: boolean;
  path: string;
}

export function catalogRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../../catalog");
}

export function catalogFile(id: string): string {
  const parts = id.split("/");
  if (parts.length !== 2 || !PACKS.has(parts[0]) || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(parts[1])) {
    throw new Error(`Invalid catalog skill id: ${id}`);
  }
  return join(catalogRoot(), `${id}.md`);
}

function isSkillPathWithinRoot(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

export async function readBoundedSkillFile(
  path: string,
  trustedRoots: readonly string[],
  maxBytes = MAX_SKILL_FILE_BYTES,
): Promise<{ bytes: Buffer; mtimeMs: number }> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > MAX_SKILL_FILE_BYTES) throw new Error("Invalid skill file size limit");
  const canonical = await realpath(path);
  if (!trustedRoots.some((root) => isSkillPathWithinRoot(root, canonical))) throw new Error(`Skill path escapes its source root: ${path}`);
  const handle = await open(canonical, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await handle.stat();
    const current = await lstat(canonical);
    if (!info.isFile() || info.ino !== current.ino || info.dev !== current.dev || await realpath(path) !== canonical) {
      throw new Error(`Skill file is not a stable regular file: ${path}`);
    }
    if (info.size > maxBytes) throw new Error(`Skill file exceeds size limit (${maxBytes} bytes): ${path}`);
    const bytes = Buffer.alloc(info.size + 1);
    let used = 0;
    while (used < bytes.length) {
      const read = await handle.read(bytes, used, bytes.length - used, used);
      if (read.bytesRead === 0) break;
      used += read.bytesRead;
    }
    if (used > info.size) throw new Error(`Skill file changed size during read: ${path}`);
    return { bytes: bytes.subarray(0, used), mtimeMs: info.mtimeMs };
  } finally {
    await handle.close();
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.length > 0);
}

export async function loadCatalog(): Promise<CatalogSkill[]> {
  const root = catalogRoot();
  const skills: CatalogSkill[] = [];

  let packs: string[];
  try {
    packs = (await readdir(root, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && PACKS.has(e.name))
      .map((e) => e.name);
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw e;
  }

  const realRoot = await realpath(root);
  for (const pack of packs) {
    const dir = join(root, pack);
    const files = (await readdir(dir, { withFileTypes: true }))
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name);

    for (const file of files) {
      const stem = file.slice(0, -3);
      const id = `${pack}/${stem}`;
      const abs = catalogFile(id);
      const { bytes } = await readBoundedSkillFile(abs, [realRoot]);
      const { data } = matter(bytes.toString("utf-8"));
      const name = typeof data.name === "string" ? data.name : stem;
      const declaredPack = typeof data.pack === "string" ? data.pack : pack;
      if (!PACKS.has(declaredPack)) continue;

      skills.push({
        id,
        name,
        pack: declaredPack as SkillPack,
        langs: asStringArray(data.langs),
        triggers: asStringArray(data.triggers),
        always: data.always === true,
        path: `${pack}/${file}`,
      });
    }
  }

  return skills;
}
