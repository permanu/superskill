// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SessionTrace, TraceToolCall, Finding } from "./types.js";
import type { RepoContext, SteeringFile } from "./repo-context.js";
import {
  detectErrorRate,
  detectFailedReads,
  detectNavigationThrash,
  detectOversizeOutputs,
  detectPromptCorrections,
  detectRepeatedCalls,
  detectSessionNoteSignals,
  detectSteering,
  detectToolErrorLoop,
  detectUnguardedRepo,
  detectVerificationGap,
} from "./detectors.js";
import { detectDeadSkills } from "./skills.js";
import type { Graph } from "../graph/schema.js";

function call(index: number, name: string, overrides: Partial<TraceToolCall> = {}): TraceToolCall {
  return { index, name, status: "ok", ...overrides };
}

function trace(overrides: Partial<SessionTrace> = {}): SessionTrace {
  return {
    ref: { tool: "opencode", id: "ses_test1234", startedAt: 0, updatedAt: 60_000, storagePath: "/tmp/x" },
    userTurns: [],
    toolCalls: [],
    filesRead: [],
    filesWritten: [],
    commands: [],
    truncated: false,
    ...overrides,
  };
}

function repo(overrides: Partial<RepoContext> = {}): RepoContext {
  return {
    root: "/tmp/repo",
    isGit: true,
    scripts: {},
    checkScripts: [],
    hasCi: false,
    hasPreCommit: false,
    steering: [],
    ...overrides,
  };
}

function byCategory(findings: Finding[], category: Finding["category"]): Finding[] {
  return findings.filter((finding) => finding.category === category);
}

describe("session detectors", () => {
  it("flags repeated failing calls", () => {
    const failing = [
      call(1, "bash", { status: "error", inputSummary: "npm test", errorText: "1 failed" }),
      call(2, "bash", { status: "error", inputSummary: "npm test", errorText: "1 failed" }),
      call(3, "bash", { status: "error", inputSummary: "npm test", errorText: "1 failed" }),
    ];
    const findings = detectToolErrorLoop(trace({ toolCalls: failing }));
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("high");
    expect(findings[0].category).toBe("tool-economy");
  });

  it("flags identical calls even when they succeed", () => {
    const calls = [1, 2, 3].map((i) => call(i, "read", { inputSummary: "src/a.ts", filePath: "src/a.ts" }));
    const findings = detectRepeatedCalls(trace({ toolCalls: calls }));
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("medium");
  });

  it("flags navigation thrash on a file that is never edited", () => {
    const calls = [1, 2, 3, 4].map((i) => call(i, "read", { inputSummary: "src/a.ts", filePath: "src/a.ts" }));
    const findings = detectNavigationThrash(trace({ toolCalls: calls, filesRead: ["src/a.ts"] }));
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("navigation");
  });

  it("does not flag thrash when the file was edited", () => {
    const calls = [1, 2, 3, 4].map((i) => call(i, "read", { inputSummary: "src/a.ts", filePath: "src/a.ts" }));
    const findings = detectNavigationThrash(trace({ toolCalls: calls, filesRead: ["src/a.ts"], filesWritten: ["src/a.ts"] }));
    expect(findings).toHaveLength(0);
  });

  it("flags failed reads", () => {
    const calls = [
      call(1, "read", { status: "error", errorText: "ENOENT: no such file", inputSummary: "src/missing.ts" }),
      call(2, "read", { status: "error", errorText: "ENOENT: no such file", inputSummary: "src/other.ts" }),
    ];
    const findings = detectFailedReads(trace({ toolCalls: calls }));
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("low");
  });

  it("flags a verification gap when checks exist but were never run", () => {
    const session = trace({ filesWritten: ["src/a.ts"], commands: ["ls", "cat src/a.ts"] });
    const findings = detectVerificationGap(session, repo({ checkScripts: ["test", "lint"] }));
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("high");
    expect(findings[0].proposal).toContain("npm run test");
  });

  it("does not flag verification when a check ran", () => {
    const session = trace({ filesWritten: ["src/a.ts"], commands: ["npm run test"] });
    expect(detectVerificationGap(session, repo({ checkScripts: ["test"] }))).toHaveLength(0);
  });

  it("flags oversized tool outputs", () => {
    const calls = [1, 2, 3].map((i) => call(i, "bash", { inputSummary: "cat big.log", outputBytes: 200 * 1024 }));
    const findings = detectOversizeOutputs(trace({ toolCalls: calls }));
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("tool-economy");
  });

  it("flags repeated user corrections", () => {
    const findings = detectPromptCorrections(trace({ userTurns: ["no, that's wrong", "actually use the other API", "please continue"] }));
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("prompt");
  });

  it("flags an error-heavy session", () => {
    const calls = Array.from({ length: 12 }, (_, i) => call(i + 1, "bash", { status: i < 6 ? "error" : "ok", inputSummary: `cmd ${i}` }));
    const findings = detectErrorRate(trace({ toolCalls: calls }));
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toContain("6/12");
  });

  it("flags blocked vault session notes", () => {
    const findings = detectSessionNoteSignals(trace({ sessionNotes: { blocked: ["missing credentials"] } }));
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("prompt");
    expect(findings[0].title).toContain("blocked");
  });

  it("ignores traces without session notes", () => {
    expect(detectSessionNoteSignals(trace())).toHaveLength(0);
  });
});

describe("repo detectors", () => {
  it("flags an unguarded repo", () => {
    const findings = detectUnguardedRepo(repo());
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("high");
    expect(findings[0].category).toBe("guardrails");
  });

  it("does not flag a guarded repo", () => {
    expect(detectUnguardedRepo(repo({ checkScripts: ["test"], hasCi: true, hasPreCommit: true }))).toHaveLength(0);
  });

  it("flags oversized and stale steering", () => {
    const bigFile: SteeringFile = {
      path: "AGENTS.md",
      realPath: "/tmp/repo/AGENTS.md",
      scope: "project",
      lines: 400,
      chars: 30_000,
      estimatedTokens: 8_000,
      content: "see `missing-one.md` and `missing-two.md` and `missing-three.md`",
    };
    const findings = detectSteering(repo({ steering: [bigFile] }));
    const categories = findings.map((finding) => finding.title);
    expect(categories.some((title) => title.includes("very large"))).toBe(true);
    expect(categories.some((title) => title.includes("do not exist"))).toBe(true);
  });

  it("flags duplicated steering across files", () => {
    const shared = Array.from({ length: 35 }, (_, i) => `always run the linter before committing change number ${i} to the repo`).join("\n");
    const a: SteeringFile = { path: "AGENTS.md", realPath: "/tmp/repo/AGENTS.md", scope: "project", lines: 35, chars: shared.length, estimatedTokens: 200, content: shared };
    const b: SteeringFile = { path: "CLAUDE.md", realPath: "/tmp/repo/CLAUDE.md", scope: "project", lines: 35, chars: shared.length, estimatedTokens: 200, content: shared };
    const findings = detectSteering(repo({ steering: [a, b] }));
    expect(findings.some((finding) => finding.title.includes("Duplicated steering"))).toBe(true);
  });
});

describe("detector branch coverage", () => {
  it("ignores healthy calls and summary-less errors in the error-loop detector", () => {
    const mixed = [
      call(1, "bash", { inputSummary: "npm test" }),
      call(2, "bash", { status: "error", inputSummary: "npm test" }),
      call(3, "bash", { status: "error", inputSummary: "npm test" }),
      call(4, "bash", { status: "error", inputSummary: "npm test" }),
    ];
    expect(detectToolErrorLoop(trace({ toolCalls: mixed }))).toHaveLength(1);

    const summaryless = [1, 2, 3].map((i) => call(i, "bash", { status: "error" }));
    expect(detectToolErrorLoop(trace({ toolCalls: summaryless }))).toHaveLength(0);

    const under = [1, 2].map((i) => call(i, "bash", { status: "error", inputSummary: "npm test" }));
    expect(detectToolErrorLoop(trace({ toolCalls: under }))).toHaveLength(0);
  });

  it("formats error-loop evidence without error text", () => {
    const failing = [1, 2, 3].map((i) => call(i, "bash", { status: "error", inputSummary: "npm test" }));
    const findings = detectToolErrorLoop(trace({ toolCalls: failing }));
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence[0].ref).toContain("#1 bash");
    expect(findings[0].evidence[0].ref).not.toContain(": ");
  });

  it("skips summary-less calls, edits, and empty terminal polls in the repeat detector", () => {
    expect(
      detectRepeatedCalls(trace({ toolCalls: [1, 2, 3].map((i) => call(i, "read", { status: "ok" })) })),
    ).toHaveLength(0);

    const edits = [1, 2, 3].map((i) => call(i, "edit", { inputSummary: "src/a.ts" }));
    expect(detectRepeatedCalls(trace({ toolCalls: edits }))).toHaveLength(0);

    const polls = [1, 2, 3].map((i) => call(i, "write_stdin", { inputSummary: 'write_stdin chars: ""' }));
    expect(detectRepeatedCalls(trace({ toolCalls: polls }))).toHaveLength(0);

    const pair = [1, 2].map((i) => call(i, "read", { inputSummary: "src/a.ts" }));
    expect(detectRepeatedCalls(trace({ toolCalls: pair }))).toHaveLength(0);
  });

  it("only counts read-like calls with paths for navigation thrash", () => {
    const calls = [
      call(1, "bash", { status: "ok", filePath: "src/a.ts" }),
      call(2, "read", { status: "error", filePath: "src/a.ts" }),
      call(3, "read", { status: "ok" }),
      call(4, "read", { status: "ok", filePath: "src/b.ts" }),
    ];
    const findings = detectNavigationThrash(trace({ toolCalls: calls, filesRead: ["src/c.ts"] }));
    expect(findings).toHaveLength(0);
  });

  it("matches both failed-read patterns and survives missing error text", () => {
    const calls = [
      call(1, "read", { status: "error", inputSummary: "src/missing.ts" }),
      call(2, "bash", { status: "error", inputSummary: "cat x", errorText: "no such file or directory" }),
      call(3, "bash", { status: "error", inputSummary: "false", errorText: "command failed" }),
    ];
    const findings = detectFailedReads(trace({ toolCalls: calls }));
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toContain("2 tool calls failed");
    expect(findings[0].evidence[0].ref).not.toContain(": ");
  });

  it("returns no verification gap without writes or without checks, and truncates long write lists", () => {
    expect(detectVerificationGap(trace(), repo({ checkScripts: ["test"] }))).toHaveLength(0);

    const written = trace({ filesWritten: ["a.ts"], commands: [] });
    expect(detectVerificationGap(written, repo({ checkScripts: [] }))).toHaveLength(0);

    const many = trace({
      filesWritten: ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"],
      commands: ["ls"],
    });
    const findings = detectVerificationGap(many, repo({ checkScripts: ["test", "lint", "check", "build"] }));
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence[0].ref).toContain("…");
    expect(findings[0].detail).toContain("test, lint, check, build");
  });

  it("handles oversize calls with and without byte counts", () => {
    const calls = [
      call(1, "bash", { inputSummary: "cat big.log", outputBytes: 200 * 1024 }),
      call(2, "bash", { inputSummary: "cat big.log", outputBytes: 300 * 1024 }),
      call(3, "bash", { outputBytes: 400 * 1024 }),
      call(4, "bash", { inputSummary: "echo hi" }),
      call(5, "bash", {}),
    ];
    const findings = detectOversizeOutputs(trace({ toolCalls: calls }));
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toContain("3 tool outputs");
    expect(findings[0].evidence.some((item) => item.ref.includes("#3 bash"))).toBe(true);

    const two = [
      call(1, "bash", { outputBytes: 200 * 1024 }),
      call(2, "bash", { outputBytes: 200 * 1024 }),
    ];
    expect(detectOversizeOutputs(trace({ toolCalls: two }))).toHaveLength(0);
  });

  it("ignores a low error ratio and single corrections", () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      call(i + 1, "bash", { status: i < 5 ? "error" : "ok", inputSummary: `cmd ${i}` }),
    );
    expect(detectErrorRate(trace({ toolCalls: many }))).toHaveLength(0);
    expect(detectPromptCorrections(trace({ userTurns: ["no thanks"] }))).toHaveLength(0);
  });

  it("reports plural blockers and partial completions", () => {
    const blockers = detectSessionNoteSignals(
      trace({ sessionNotes: { blocked: ["missing creds", "dead endpoint"] } }),
    );
    expect(blockers).toHaveLength(1);
    expect(blockers[0].title).toContain("2 blockers");

    const partial = detectSessionNoteSignals(
      trace({ sessionNotes: { partiallyCompleted: ["wrote tests"] } }),
    );
    expect(partial).toHaveLength(1);
    expect(partial[0].title).toContain("1 item partially");

    const partialMany = detectSessionNoteSignals(
      trace({ sessionNotes: { partiallyCompleted: ["a", "b"] } }),
    );
    expect(partialMany[0].title).toContain("2 items partially");

    const empty = detectSessionNoteSignals(trace({ sessionNotes: {} }));
    expect(empty).toHaveLength(0);
  });

  it("covers partial guardrail combinations", () => {
    expect(detectUnguardedRepo(repo({ isGit: false }))).toHaveLength(0);

    const preCommitOnly = detectUnguardedRepo(repo({ checkScripts: ["test"], hasCi: false, hasPreCommit: true }));
    expect(preCommitOnly).toHaveLength(0);
    expect(detectUnguardedRepo(repo({ checkScripts: ["test"], hasCi: true, hasPreCommit: false }))).toHaveLength(0);

    const noGuard = detectUnguardedRepo(repo({ checkScripts: ["test"] }));
    expect(noGuard).toHaveLength(1);
    expect(noGuard[0].severity).toBe("medium");
    expect(noGuard[0].title).toContain("no CI workflow running checks, no pre-commit hook");
  });

  it("does not flag global-only steering pairs or dissimilar and tiny files", () => {
    const longA = Array.from({ length: 35 }, (_, i) => `alpha rule number ${i} about doing the thing`).join("\n");
    const longB = Array.from({ length: 35 }, (_, i) => `beta rule number ${i} about a totally different thing`).join("\n");
    const shortShared = "one\n".repeat(5);
    const file = (name: string, content: string, scope: SteeringFile["scope"]): SteeringFile => ({
      path: name,
      realPath: `/tmp/repo/${name}`,
      scope,
      lines: content.split("\n").length,
      chars: content.length,
      estimatedTokens: 100,
      content,
    });
    const globalPair = detectSteering(
      repo({ steering: [file("g1.md", longA, "global"), file("g2.md", longA, "global")] }),
      "/tmp/home",
    );
    expect(globalPair.some((finding) => finding.title.includes("Duplicated steering"))).toBe(false);

    const dissimilar = detectSteering(
      repo({ steering: [file("AGENTS.md", longA, "project"), file("CLAUDE.md", longB, "project")] }),
      "/tmp/home",
    );
    expect(dissimilar.some((finding) => finding.title.includes("Duplicated steering"))).toBe(false);

    const tiny = detectSteering(
      repo({ steering: [file("small-a.md", shortShared, "project"), file("small-b.md", shortShared, "project")] }),
      "/tmp/home",
    );
    expect(tiny.some((finding) => finding.title.includes("Duplicated steering"))).toBe(false);
  });

  it("resolves tilde, absolute, and relative steering pointers", async () => {
    const home = await mkdtemp(join(tmpdir(), "steering-home-"));
    const repoRoot = await mkdtemp(join(tmpdir(), "steering-repo-"));
    try {
      await writeFile(join(home, "exists.md"), "x");
      await writeFile(join(repoRoot, "present.md"), "x");
      await writeFile(join(repoRoot, "abs.md"), "x");
      const content = [
        "`~/exists.md`",
        "`~/missing.md`",
        "`~weird.md`",
        "`/definitely/not/here.md`",
        "`present.md`",
        "`missing-one.md`",
        "`missing-two.md`",
        "`http.md`",
        "`node_modules/skip.ts`",
        "`present.md`",
      ].join("\n");
      const file: SteeringFile = {
        path: "AGENTS.md",
        realPath: join(repoRoot, "AGENTS.md"),
        scope: "project",
        lines: 11,
        chars: content.length,
        estimatedTokens: 2_500,
        content,
      };
      const findings = detectSteering(repo({ root: repoRoot, steering: [file] }), home);
      const stale = findings.find((finding) => finding.title.includes("do not exist"));
      expect(stale).toBeDefined();
      expect(stale!.evidence.length).toBeGreaterThan(0);
      expect(findings.some((finding) => finding.title.includes("getting heavy"))).toBe(true);
    } finally {
      await rm(home, { recursive: true, force: true });
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});

describe("skills detector", () => {
  it("lists never-activated skills once enough sessions exist", () => {
    const graph: Graph = {
      nodes: [
        { type: "project", id: "project", stack: ["typescript"], tools: ["opencode"], phase: "implement", ts: 1 },
        { type: "skill", id: "code/ts", source: "catalog", audits: { gen: "pass", socket: "pass", snyk: "pass" }, installs: 0, stars: 0, w: 0.8, ts: 1 },
        { type: "skill", id: "pipeline/verify", source: "catalog", audits: { gen: "pass", socket: "pass", snyk: "pass" }, installs: 0, stars: 0, w: 0.8, ts: 1 },
        ...Array.from({ length: 3 }, (_, i) => ({
          type: "session" as const,
          id: `s_${i}`,
          intent: "work",
          skills: ["code/ts"],
          files: [],
          outcome: "success" as const,
          insights: [],
          ts: i,
        })),
      ],
      edges: [
        { type: "project_skill", from: "project", to: "code/ts", w: 0.9, activations: 3 },
        { type: "project_skill", from: "project", to: "pipeline/verify", w: 0.8, activations: 0 },
      ],
    };
    const findings = detectDeadSkills(graph);
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence.some((item) => item.ref.includes("pipeline/verify"))).toBe(true);
    expect(byCategory(findings, "skills")).toHaveLength(1);
  });
});
