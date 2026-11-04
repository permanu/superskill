import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { claimsCommand } from "../src/commands/claims.js";

const run = promisify(execFile);

describe("structural evidence for scoped drift", () => {
  let root: string;
  const git = (args: string[]) => run("git", ["-c", "core.hooksPath=/dev/null", ...args], {
    cwd: root, timeout: 10000,
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "superskill-scoped-drift-"));
    await cp(fileURLToPath(new URL("../evals/scoped-drift/fixtures/store", import.meta.url)), root, { recursive: true });
    await git(["init", "-q", "-b", "main"]);
    await git(["add", "."]);
    await git(["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "fixture"]);
  });

  afterAll(async () => { if (root) await rm(root, { recursive: true, force: true }); });

  it("keeps structural facts separate from proposed changes and behavior", async () => {
    const source = await readFile(join(root, "src/store.mjs"), "utf8");
    const report = await claimsCommand({ root, claims: [
      { kind: "symbol-exported", file: "src/store.mjs", name: "get" },
      { kind: "file-exists", path: "src/legacy-store.mjs" },
      { kind: "file-exists", path: "src/bounded-store.mjs" },
      { kind: "symbol-exists", file: "src/plugin.lua", name: "flush" },
      { kind: "no-other-callers", file: "src/store.mjs", symbol: "get" },
    ] });
    expect(report.claims.map(item => item.verdict)).toEqual(["verified", "refuted", "refuted", "unverifiable", "unverifiable"]);
    expect(report.claims[0].evidence.some(item => item.confidence === "EXTRACTED")).toBe(true);
    expect(await readFile(join(root, "src/store.mjs"), "utf8")).toBe(source);
    await expect(claimsCommand({ root, claims: [{ kind: "atomic", file: "src/store.mjs" }] })).rejects.toThrow("unknown claim kind");
  });

  it("rejects a reference outside the selected root", async () => {
    await expect(claimsCommand({ root, claims: [{ kind: "file-exists", path: "../other-project.mjs" }] })).rejects.toThrow(/outside/);
  });

  it("rechecks dirty source rather than treating unchanged HEAD as fresh evidence", async () => {
    const path = join(root, "src/store.mjs");
    const before = await readFile(path, "utf8");
    const head = (await git(["rev-parse", "HEAD"])).stdout;
    const args = { root, claims: [{ kind: "symbol-exported", file: "src/store.mjs", name: "get" }] };
    expect((await claimsCommand(args)).claims[0].verdict).toBe("verified");
    try {
      await writeFile(path, before.replace("export function get(", "export function lookup("));
      expect((await git(["rev-parse", "HEAD"])).stdout).toBe(head);
      expect((await claimsCommand(args)).claims[0].verdict).toBe("refuted");
    } finally {
      await writeFile(path, before);
    }
  });
});
