import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultError, VaultFS } from "../vault-fs.js";
import { serializeFrontmatter } from "../frontmatter.js";
import { estimateTokens } from "../token-estimator.js";
import type { Graph, SkillNode } from "../graph/schema.js";
import { currentPlatform } from "../../setup/types.js";
import { formatBytes, formatDuration, renderDigest, toolCensus } from "./digest.js";
import { configuredMcpServers, detectPlugins, mcpServerOf } from "./plugins.js";
import { detectDeadSkills } from "./skills.js";
import { appendFixLog, latestReport, listReports, loadReportFile, recurrenceCounts, reportSummaryLine, saveReport, setFindingStatus } from "./store.js";
import type { SessionTrace, WatchdogReport } from "./types.js";

vi.mock("../../setup/types.js", async () => {
  const actual = await vi.importActual<typeof import("../../setup/types.js")>("../../setup/types.js");
  return { ...actual, currentPlatform: vi.fn(actual.currentPlatform) };
});

let home: string;
let vault: VaultFS;

beforeEach(async () => {
  vi.mocked(currentPlatform).mockReset().mockReturnValue("darwin");
  home = await mkdtemp(join(tmpdir(), "watchdog-private-coverage-"));
  vi.stubEnv("HOME", home);
  vault = new VaultFS(join(home, "vault"), { projectSlug: "fixture" });
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.mocked(currentPlatform).mockReset();
  vi.unstubAllEnvs();
  await rm(home, { recursive: true, force: true });
});

function trace(overrides: Partial<SessionTrace> = {}): SessionTrace {
  return {
    ref: { tool: "fixture", id: "session-12345678", startedAt: 0, storagePath: "fixture.jsonl" },
    userTurns: [], toolCalls: [], filesRead: [], filesWritten: [], commands: [], truncated: false,
    ...overrides,
  };
}

function report(overrides: Partial<WatchdogReport> = {}): WatchdogReport {
  return {
    id: "wd_fixture", kind: "dig", scope: { kind: "env", sessionIds: [] },
    generatedAt: "2026-10-14T00:00:00.000Z", sessions: 0, findings: [], digests: [],
    summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 }, ...overrides,
  };
}

async function note(name: string, findings?: unknown): Promise<string> {
  const path = `watchdog/${name}.md`;
  await vault.write(path, serializeFrontmatter({ type: "watchdog", ...(findings === undefined ? {} : { findings }) }, "\nOriginal report body\n"));
  return path;
}

async function config(path: string, value: unknown, raw = false): Promise<void> {
  const target = join(home, path);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, raw ? String(value) : JSON.stringify(value));
}

function skillGraph(total: number, active: number, sessions = 3): Graph {
  const skills: SkillNode[] = Array.from({ length: total }, (_, index) => ({
    type: "skill", id: `skill-${index}`, source: "catalog", audits: { gen: "pass", socket: "pass", snyk: "pass" },
    installs: 0, stars: 0, w: 0.5, ts: 0,
  }));
  return {
    nodes: [
      { type: "project", id: "project", stack: [], tools: [], phase: "review", ts: 0 },
      ...skills,
      ...Array.from({ length: sessions }, (_, index) => ({ type: "session" as const, id: `session-${index}`, intent: "fixture", skills: [], files: [], outcome: null, insights: [], ts: index })),
    ],
    edges: [
      ...skills.slice(0, active).map(skill => ({ type: "project_skill" as const, from: "project", to: skill.id, w: 0.5, activations: 2 })),
      { type: "session_file", from: "session-0", to: "fixture.ts", action: "read" },
    ],
  };
}

describe("digest privacy and bounded summaries", () => {
  it.each([
    [1000, undefined, "unknown duration"], [1000, 1000, "unknown duration"],
    [1000, 500, "unknown duration"], [0, 300_000, "5m"], [0, 7_500_000, "2h 5m"],
  ])("formats duration %s → %s", (start, end, expected) => {
    expect(formatDuration(start, end)).toBe(expected);
  });

  it("keeps useful token, diff, census and truncation metadata without sensitive excerpts", async () => {
    const sensitive = trace({
      ref: { tool: "fixture", id: "session-12345678", title: "PRIVATE_TITLE", project: "/fixture/repo", startedAt: 0, updatedAt: 7_500_000, storagePath: "fixture.jsonl" },
      model: "fixture-model", provider: "fixture-provider", cost: 0.1234,
      tokens: { input: 20, output: 10, cacheRead: 4, cacheWrite: 3, reasoning: 2 },
      diff: { additions: 5, deletions: 2, files: 1 }, sessionNotes: { outcome: "PRIVATE_OUTCOME" },
      userTurns: ["PRIVATE_PROMPT"], commands: ["PRIVATE_COMMAND"], truncated: true,
      toolCalls: [
        { index: 0, name: "read", status: "ok" },
        { index: 1, name: "bash", status: "error", inputSummary: "PRIVATE_COMMAND", errorText: "PRIVATE_ERROR" },
        { index: 2, name: "read", status: "unknown" },
      ],
    });
    const digest = renderDigest(sensitive);
    for (const secret of ["PRIVATE_TITLE", "PRIVATE_OUTCOME", "PRIVATE_PROMPT", "PRIVATE_COMMAND", "PRIVATE_ERROR"]) expect(digest).not.toContain(secret);
    expect(digest).toContain("model: fixture-model (fixture-provider)");
    expect(digest).toContain("cache read 4 / cache write 3 / reasoning 2 · cost $0.1234");
    expect(digest).toContain("diff: +5/-2 across 1 files");
    expect(digest).toContain("3 calls, 1 errors — read 2, bash 1 (1 err)");
    expect(digest).toContain("#1 bash (error)");
    expect(digest).toContain("trace truncated by reader caps");
    expect(toolCensus(sensitive)).toMatchObject({ total: 3, errors: 1, byName: [{ name: "read", count: 2, errors: 0 }, { name: "bash", count: 1, errors: 1 }] });
    const path = await saveReport(vault, report({ digests: [digest] }));
    const persisted = await vault.read(path);
    expect(persisted).toContain("cache read 4");
    expect(persisted).not.toContain("PRIVATE_");
    expect((await loadReportFile(vault, path))?.frontmatter).not.toHaveProperty("project");
    expect((await loadReportFile(vault, path))?.frontmatter).not.toHaveProperty("tool");
  });

  it("does not invent optional metadata for an empty or uncached trace", () => {
    const digest = renderDigest(trace({ model: "model-only", cost: 0, sessionNotes: {}, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 } }), 2400, { includePrompts: true });
    expect(digest).toContain("model: model-only");
    expect(digest).toContain("tokens: in 0 / out 0");
    for (const omitted of ["cache read", "cache write", "reasoning", "cost $", "### Prompts", "### Failures", "### Commands", "outcome:"]) expect(digest).not.toContain(omitted);
    expect(toolCensus(trace())).toEqual({ total: 0, errors: 0, byName: [] });
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it("includes sensitive excerpts only by opt-in and caps each displayed section", () => {
    const sensitive = trace({
      ref: { tool: "fixture", id: "session-12345678", title: `${"T".repeat(160)}TITLE_TAIL`, startedAt: 0, storagePath: "fixture.jsonl" },
      sessionNotes: { outcome: `${"O".repeat(160)}OUTCOME_TAIL` },
      userTurns: Array.from({ length: 6 }, (_, index) => `prompt-${index}-${"p".repeat(220)}PROMPT_TAIL`),
      toolCalls: Array.from({ length: 9 }, (_, index) => ({ index, name: "bash", status: "error", ...(index === 0 ? {} : { inputSummary: `command-${index}`, errorText: `${"e".repeat(160)}ERROR_TAIL` }) })),
      commands: ["duplicate", "duplicate", ...Array.from({ length: 13 }, (_, index) => `shell-${index}-${"c".repeat(180)}COMMAND_TAIL`)],
    });
    const digest = renderDigest(sensitive, 10_000, { includePrompts: true });
    expect(digest).toContain("sensitive excerpts included by request");
    expect(digest).toContain("### Prompts (6 shown, first 5)");
    expect(digest).toContain("prompt-4-");
    expect(digest).not.toContain("prompt-5-");
    expect(digest).toContain("#0 bash (error)");
    expect(digest).toContain("#7 bash (error) `command-7`");
    expect(digest).not.toContain("#8 bash");
    for (const tail of ["TITLE_TAIL", "OUTCOME_TAIL", "PROMPT_TAIL", "ERROR_TAIL", "COMMAND_TAIL"]) expect(digest).not.toContain(tail);
    expect(digest.match(/^- `duplicate`$/gm)).toHaveLength(1);
    expect(digest).not.toContain("shell-11-");
    const bounded = renderDigest(sensitive, 100, { includePrompts: true });
    expect(bounded).toContain("[truncated");
    expect(estimateTokens(bounded)).toBeLessThanOrEqual(100);
  });
});

describe("report state boundaries", () => {
  it.each([undefined, "not-an-array", {}])("loads sparse report findings %j as an empty list", async findings => {
    const path = await note("001-sparse", findings);
    expect((await loadReportFile(vault, path))?.findings).toEqual([]);
  });

  it("ignores malformed finding entries and applies defaults only to valid identifiers and titles", async () => {
    const path = await note("001-mixed", [null, false, "bad", {}, { id: 1, title: "bad" }, { id: "bad", title: 1 },
      { id: "minimal", title: "Minimal", proposal: 17 },
      { id: "full", title: "Full", category: "prompt", severity: "high", status: "dismissed", proposal: "Keep reviewed" },
    ]);
    expect((await loadReportFile(vault, path))?.findings).toEqual([
      { id: "minimal", title: "Minimal", category: "environment", severity: "low", status: "open", proposal: "" },
      { id: "full", title: "Full", category: "prompt", severity: "high", status: "dismissed", proposal: "Keep reviewed" },
    ]);
    expect(await setFindingStatus(vault, path, "minimal", "applied")).toBe(true);
    expect((await loadReportFile(vault, path))?.findings.map(finding => finding.status)).toEqual(["applied", "dismissed"]);
    expect(await vault.read(path)).toContain("Original report body");
  });

  it("handles missing, unreadable and no-longer-readable reports without manufacturing state", async () => {
    expect(await latestReport(vault)).toBeNull();
    expect(await loadReportFile(vault, "watchdog/missing.md")).toBeNull();
    await note("001-old", []);
    await vault.write("watchdog/ignored.txt", "not a report");
    vi.spyOn(vault, "read").mockRejectedValue(new VaultError("PERMISSION_DENIED", "fixture report access denied"));
    expect(await listReports(vault)).toEqual([]);
    vi.spyOn(vault, "list").mockRejectedValue(new Error("fixture storage unavailable"));
    expect(await listReports(vault)).toEqual([]);
  });

  it("honors report ordering, lookback limits and relevant finding IDs", async () => {
    await note("001-old", [{ id: "wanted", title: "Wanted" }]);
    await note("002-middle", [{ id: "irrelevant", title: "Other" }]);
    await note("003-latest", [{ id: "wanted", title: "Wanted" }]);
    expect((await listReports(vault, 1)).map(item => item.name)).toEqual(["003-latest.md"]);
    expect((await latestReport(vault))?.name).toBe("003-latest.md");
    expect(await listReports(vault, 0)).toEqual([]);
    expect(await recurrenceCounts(vault, new Set())).toEqual(new Map());
    expect(await recurrenceCounts(vault, new Set(["wanted"]))).toEqual(new Map([["wanted", 2]]));
    expect(await recurrenceCounts(vault, new Set(["wanted"]), 1)).toEqual(new Map([["wanted", 1]]));
  });

  it("does not append empty logs or modify a report for an unknown finding", async () => {
    const path = await note("001-log", [{ id: "known", title: "Known" }]);
    const before = await vault.read(path);
    await appendFixLog(vault, path, []);
    expect(await setFindingStatus(vault, path, "absent", "dismissed")).toBe(false);
    expect(await vault.read(path)).toBe(before);
    await appendFixLog(vault, path, ["Reviewed by fixture", "No source data removed"]);
    expect(await vault.read(path)).toContain("\n- Reviewed by fixture\n- No source data removed\n");
  });

  it.each([new VaultError("PERMISSION_DENIED", "denied"), new Error("storage failed")])("propagates nonmissing update failure %s", async error => {
    vi.spyOn(vault, "update").mockRejectedValueOnce(error);
    await expect(setFindingStatus(vault, "watchdog/fixture.md", "known", "applied")).rejects.toBe(error);
  });

  it("returns zero defaults and converts populated report summary counters", () => {
    expect(reportSummaryLine({})).toEqual({ critical: 0, high: 0, medium: 0, low: 0, total: 0 });
    expect(reportSummaryLine({ critical: "1", high: 2, medium: "3", low: 4, total: "10" })).toEqual({ critical: 1, high: 2, medium: 3, low: 4, total: 10 });
  });
});

describe("skill activation evidence thresholds", () => {
  it("requires enough sessions and distinguishes an empty or fully active skill set", () => {
    expect(detectDeadSkills(skillGraph(4, 0, 2))).toEqual([]);
    expect(detectDeadSkills(skillGraph(0, 0))).toEqual([]);
    expect(detectDeadSkills(skillGraph(4, 4))).toEqual([]);
  });

  it.each([[4, 0, "low"], [8, 3, "low"], [8, 0, "medium"]] as const)("ranks %s skills with %s active at %s", (total, active, severity) => {
    const findings = detectDeadSkills(skillGraph(total, active));
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe(severity);
    expect(findings[0].evidence).toHaveLength(total - active);
    expect(findings[0].title.includes("routing may be too narrow")).toBe(severity === "medium");
  });

  it("caps dead-skill evidence while retaining an exact omitted count", () => {
    const finding = detectDeadSkills(skillGraph(14, 0))[0];
    expect(finding.evidence).toHaveLength(13);
    expect(finding.evidence.at(-1)?.ref).toBe("…and 2 more");
    expect(finding.title).toContain("14/14 skills");
  });
});

describe("local plugin availability and evidence", () => {
  it.each([
    ["bash", null], ["superskill_read", null], ["mcp__superskill__read", null],
    ["mcp__context7__query-docs", "context7"], ["mcp.worker.query", "worker"],
  ])("recognizes only external MCP server names in %s", (name, expected) => {
    expect(mcpServerOf(name)).toBe(expected);
  });

  it("returns no configured servers on an unsupported platform or an empty temporary home", async () => {
    vi.mocked(currentPlatform).mockReturnValue("win32");
    expect(await configuredMcpServers()).toEqual(new Map());
    vi.mocked(currentPlatform).mockReturnValue("darwin");
    expect(await configuredMcpServers()).toEqual(new Map());
  });

  it("ignores absent, malformed, empty and wrong-shaped client configuration roots", async () => {
    await config(".claude.json", { mcpServers: { primary: {} } });
    await config(".cursor/mcp.json", { mcpServers: null });
    await config(".config/opencode/opencode.json", { mcp: { secondary: {} } });
    await config(".config/crush/crush.json", { mcp: true });
    await config(".gemini/settings.json", { mcpServers: {} });
    await config(".factory/mcp.json", { mcpServers: "invalid" });
    await config(".codeium/windsurf/mcp_config.json", "{malformed", true);
    expect(await configuredMcpServers()).toEqual(new Map([["claude-code", ["primary"]], ["opencode", ["secondary"]]]));
  });

  it("does not draw plugin conclusions from too few sessions or missing configurations", async () => {
    expect(await detectPlugins(Array.from({ length: 4 }, () => trace()))).toEqual([]);
    expect(await detectPlugins(Array.from({ length: 5 }, () => trace({ toolCalls: [{ index: 0, name: "bash", status: "ok" }, { index: 1, name: "mcp__superskill__read", status: "ok" }] })))).toEqual([]);
  });

  it.each([1, 3])("reports %s unused server(s) without flagging superskill or an actually used server", async count => {
    const idle = Object.fromEntries(Array.from({ length: count }, (_, index) => [`idle-${index}`, {}]));
    await config(".claude.json", { mcpServers: { superskill: {}, used: {}, ...idle } });
    const finding = (await detectPlugins(Array.from({ length: 5 }, () => trace({ toolCalls: [{ index: 0, name: "mcp__used__read", status: "ok" }] }))))[0];
    expect(finding.title).toBe(`${count} configured MCP server${count === 1 ? "" : "s"} never called in 5 sessions`);
    expect(finding.evidence).toHaveLength(count);
    expect(finding.detail).not.toContain("superskill");
    expect(finding.detail).not.toContain("used,");
  });

  it("reports repeated MCP errors but not a single failure or successful calls", async () => {
    const traces = Array.from({ length: 5 }, (_, index) => trace({ toolCalls: [
      { index: 0, name: "mcp__flaky__query", status: index < 2 ? "error" : "ok" },
      { index: 1, name: "mcp__once__query", status: index === 0 ? "error" : "ok" },
    ] }));
    const findings = await detectPlugins(traces);
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toBe('MCP server "flaky" returned 2 errors');
    expect(findings[0].evidence).toEqual([{ source: "trace", ref: "flaky: 2 failed calls" }]);
  });
});
