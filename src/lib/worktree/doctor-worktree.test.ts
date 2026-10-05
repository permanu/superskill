// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { worktreeDoctorChecks } from "../../commands/doctor.js";
import { POLICY_SCHEMA_VERSION, writePolicy, type WorktreePolicy } from "./state.js";

const execFileAsync = promisify(execFile);
const ISOLATED_ENV_KEYS = ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM"] as const;

function isolatedGitEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
}

describe("worktreeDoctorChecks", () => {
  let repo: string;
  const savedEnv: Partial<Record<(typeof ISOLATED_ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), "superskill-doctor-worktree-"));
    for (const key of ISOLATED_ENV_KEYS) savedEnv[key] = process.env[key];
    process.env.GIT_CONFIG_GLOBAL = "/dev/null";
    process.env.GIT_CONFIG_NOSYSTEM = "1";
    await execFileAsync("git", ["init", "-q"], { cwd: repo, env: isolatedGitEnv(), timeout: 15000 });
  });

  afterEach(async () => {
    for (const key of ISOLATED_ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    await rm(repo, { recursive: true, force: true });
  });

  function samplePolicy(repoId: string): WorktreePolicy {
    return {
      v: POLICY_SCHEMA_VERSION,
      repoId,
      remoteHash: null,
      repoRoot: repo,
      createdAt: "2026-01-02T03:04:05.678Z",
      updatedAt: "2026-01-02T03:04:05.678Z",
      stacks: [],
      tools: [],
      flags: {},
      hosts: [],
      activation: { hooks: false, seed: false, install: false },
    };
  }

  it("reports a non-ok policy check before activation", async () => {
    const checks = await worktreeDoctorChecks(repo);
    const policy = checks.find((entry) => entry.id === "worktree-policy");
    expect(policy).toBeDefined();
    expect(["warn", "skip"]).toContain(policy?.status);
  });

  it("reports ok with the repoId once the policy is written", async () => {
    const repoId = "0123456789abcdef";
    await writePolicy(repo, samplePolicy(repoId));

    const checks = await worktreeDoctorChecks(repo);
    const policy = checks.find((entry) => entry.id === "worktree-policy");
    expect(policy?.status).toBe("ok");
    expect(policy?.detail).toContain(repoId);
  });

  it("reports the guarded hook state best-effort", async () => {
    const checks = await worktreeDoctorChecks(repo);
    const hook = checks.find((entry) => entry.id === "worktree-hook");
    expect(hook).toBeDefined();
    expect(["ok", "warn"]).toContain(hook?.status);
  });

  it("always reports the report-only gc info check", async () => {
    const checks = await worktreeDoctorChecks(repo);
    const caches = checks.find((entry) => entry.id === "worktree-caches");
    expect(caches).toBeDefined();
    expect(caches?.detail).toContain("report-only");
  });
});
