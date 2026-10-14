import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src", import.meta.url));

describe("markdown parser import boundary", () => {
  it("routes production markdown parsing through the data-only wrapper", async () => {
    const offenders: string[] = [];
    async function walk(path: string): Promise<void> {
      for (const entry of await readdir(path, { withFileTypes: true })) {
        const file = join(path, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "__fixtures__") await walk(file);
        } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
          const name = relative(root, file).replaceAll("\\", "/");
          if (name === "lib/markdown-matter.ts") continue;
          const content = await readFile(file, "utf8");
          if (/(?:from\s*|require\s*\(\s*)["']gray-matter["']/.test(content)) offenders.push(name);
        }
      }
    }
    await walk(root);
    expect(offenders).toEqual([]);
  });
});
