import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));

describe("published package boundaries", () => {
  it("ships runtime assets without local memory, tests, traces, or source maps", async () => {
    const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--ignore-scripts", "--json"], {
      cwd: root,
      timeout: 15_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const packs = JSON.parse(stdout) as Array<{ files: Array<{ path: string }> }>;
    expect(packs).toHaveLength(1);
    const files = packs[0].files.map((entry) => entry.path);
    expect(files).toContain("dist/main.js");
    expect(files).toContain("dist/mcp-server.js");
    expect(files).toContain("skills/superskill/SKILL.md");
    expect(files.some((path) => path.endsWith(".wasm"))).toBe(true);
    expect(files.filter((path) => /(^|\/)(?:\.superskill|node_modules|coverage|tests|__fixtures__|coordination|sessions)(?:\/|$)/.test(path))).toEqual([]);
    expect(files.filter((path) => /(?:\.test\.[cm]?js|\.map|\.jsonl|\.corrupt-\d+|\.bak\.superskill)$/.test(path))).toEqual([]);
    expect(files.filter((path) => /(?:^|\/)project-map\.json$/.test(path))).toEqual([]);
  });
});
