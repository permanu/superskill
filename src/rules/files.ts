import { readdir } from "node:fs/promises";
import { join } from "node:path";

const RESERVED_FILES = new Set(["INDEX.md", "sources.md", "categories.md"]);

export function isRuleFilename(name: string): boolean {
  return name.endsWith(".md") && !RESERVED_FILES.has(name);
}

export async function collectRuleFiles(
  root: string,
  onError?: (path: string, error: unknown) => void,
): Promise<string[]> {
  const files: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (!onError) throw error;
      onError(dir, error);
      return;
    }
    entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && isRuleFilename(entry.name)) files.push(path);
    }
  }
  await walk(root);
  return files.sort();
}
