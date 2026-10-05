// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { VaultFS } from "../../vault-fs.js";
import { createFrontmatter, serializeFrontmatter } from "../../frontmatter.js";
import { listVaultTraces, loadVaultTrace } from "./vault.js";

describe("vault session-note trace source", () => {
  let dir: string;
  let vaultFs: VaultFS;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "watchdog-vault-"));
    vaultFs = new VaultFS(dir, { projectSlug: "p1" });
    await mkdir(join(dir, "projects/p1/sessions"), { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("lists and loads session notes as traces", async () => {
    const fm = createFrontmatter({
      type: "session",
      project: "p1",
      session_id: "opencode-abcd1234",
      status: "completed",
      started_at: "2026-10-01T10:00:00.000Z",
      completed_at: "2026-10-01T11:00:00.000Z",
      outcome: "shipped the fix",
      files_touched: ["src/a.ts", "src/b.ts"],
      blocked: ["missing credentials"],
      verification_run: "npm test — 42 passed",
      learnings_captured: 2,
    });
    await vaultFs.write(
      "projects/p1/sessions/2026-10-01-opencode-abcd1234.md",
      serializeFrontmatter(fm, "\n# Session\n"),
    );

    const refs = await listVaultTraces(vaultFs, { projectSlug: "p1" });
    expect(refs).toHaveLength(1);
    expect(refs[0].tool).toBe("superskill");
    expect(refs[0].id).toBe("opencode-abcd1234");
    expect(refs[0].title).toBe("shipped the fix");

    const trace = await loadVaultTrace(vaultFs, refs[0]);
    expect(trace.filesWritten).toEqual(["src/a.ts", "src/b.ts"]);
    expect(trace.commands).toEqual(["npm test — 42 passed"]);
    expect(trace.sessionNotes?.blocked).toEqual(["missing credentials"]);
    expect(trace.sessionNotes?.learningsCaptured).toBe(2);
  });

  it("filters by since", async () => {
    const fm = createFrontmatter({
      type: "session",
      project: "p1",
      session_id: "opencode-old",
      started_at: "2026-01-01T10:00:00.000Z",
      completed_at: "2026-01-01T11:00:00.000Z",
    });
    await vaultFs.write("projects/p1/sessions/2026-01-01-opencode-old.md", serializeFrontmatter(fm, "\n"));
    const refs = await listVaultTraces(vaultFs, { projectSlug: "p1", since: Date.parse("2026-06-01") });
    expect(refs).toHaveLength(0);
  });
});
