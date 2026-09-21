// SPDX-License-Identifier: AGPL-3.0-or-later

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import type { SkillPack } from "./graph/schema.js";

const PACKS: ReadonlySet<string> = new Set([
  "memory", "code", "review", "security", "ops", "devops", "optimizer", "pipeline",
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
  return join(catalogRoot(), `${id}.md`);
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

  for (const pack of packs) {
    const dir = join(root, pack);
    const files = (await readdir(dir, { withFileTypes: true }))
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name);

    for (const file of files) {
      const abs = join(dir, file);
      const raw = await readFile(abs, "utf-8");
      const { data } = matter(raw);
      const stem = file.slice(0, -3);
      const id = `${pack}/${stem}`;
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
