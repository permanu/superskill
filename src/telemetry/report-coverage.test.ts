import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandContext } from "../core/types.js";
import { telemetryCommand } from "../commands/telemetry.js";
import { loadRules, type ParsedRule } from "../rules/loader.js";
import { MAX_EVENTS_BYTES, telemetryPaths, readTelemetrySettings } from "./recorder.js";
import { buildTelemetryReport, readTelemetryEvents, renderTelemetryReport, NEVER_TRIGGERED_MIN_ACTIVATIONS } from "./report.js";
import type { ActivationEvent } from "./types.js";

vi.mock("../rules/loader.js", async () => {
  const actual = await vi.importActual<typeof import("../rules/loader.js")>("../rules/loader.js");
  return { ...actual, loadRules: vi.fn() };
});

let home: string;
const ctx = {} as CommandContext;

function rule(id: string): ParsedRule {
  return { id, lang: "typescript", prefix: "fixture", title: id, severity: "should", enforce: "review", status: "verified", triggers: { keywords: [], files: [], symbols: [] }, sourcesCount: 1, body: "fixture", path: `fixture/${id}.md` };
}

beforeEach(async () => {
  vi.mocked(loadRules).mockReset().mockResolvedValue({ rules: ["alpha", "beta", "unused"].map(rule), warnings: [] });
  home = await mkdtemp(join(tmpdir(), "telemetry-report-coverage-"));
  vi.stubEnv("HOME", home);
  vi.stubEnv("SUPERSKILL_TELEMETRY", undefined);
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.mocked(loadRules).mockReset();
  vi.unstubAllEnvs();
  await rm(home, { recursive: true, force: true });
});

function event(overrides: Partial<ActivationEvent> = {}): ActivationEvent {
  return {
    v: 1, type: "activation", at: "2026-10-14T01:00:00.000Z", tool: "fixture", project: "fixture", task_hash: "fixture-identity",
    phase: "review", stack: [], langs: [], budget: { allocated: 100, used: 40 }, selected: [], principles: [], dropped: [], rules_total: 0,
    ...overrides,
  };
}

async function eventsFile(lines: unknown[]): Promise<string> {
  const paths = telemetryPaths(home);
  await mkdir(paths.dir, { recursive: true });
  await writeFile(paths.events, lines.map(line => typeof line === "string" ? line : JSON.stringify(line)).join("\n"));
  return paths.events;
}

describe("telemetry report input and aggregate boundaries", () => {
  it("reads valid JSONL events and treats malformed data as unavailable, not empty", async () => {
    const path = await eventsFile(["", "  ", event({ selected: ["alpha"] })]);
    const result = await readTelemetryEvents(path);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].selected).toEqual(["alpha"]);
    await writeFile(path, ["null", "false", "[]", "{}", '"private prompt fixture"', "{malformed"].join("\n"));
    await expect(readTelemetryEvents(path)).rejects.toMatchObject({ code: "INVALID_DATA" });
  });

  it("keeps a genuinely absent file empty but rejects directories without exposing contents", async () => {
    expect(await readTelemetryEvents(join(home, "missing.jsonl"))).toEqual({ events: [], malformed: 0 });
    let failure: unknown;
    try { await readTelemetryEvents(home); } catch (error) { failure = error; }
    expect(failure).toMatchObject({ code: "EISDIR" });
    expect((failure as Error).message).not.toContain(home);
  });

  it("bounds telemetry payload reads to the recorder's 5 MiB policy", async () => {
    const path = join(home, "oversized.jsonl");
    await writeFile(path, Buffer.alloc(MAX_EVENTS_BYTES + 1, 0x61));
    await expect(readTelemetryEvents(path)).rejects.toMatchObject({ code: "TRUNCATED" });
  });

  it("renders an empty report with zero budgets, no window and no selections", () => {
    const report = buildTelemetryReport([], []);
    expect(report).toMatchObject({ activations: 0, firstAt: null, lastAt: null, topSelected: [], dropped: [], neverSelected: [], budget: { allocatedAvg: 0, usedAvg: 0, dropRate: 0 } });
    const rendered = renderTelemetryReport(report);
    expect(rendered).toContain("Tools: none\nPhases: none\nLanguages: none");
    expect(rendered).toContain("Budget drop rate: 0.0%");
    expect(rendered).not.toContain("Window:");
    expect(rendered.match(/\(none\)/g)).toHaveLength(2);
    expect(renderTelemetryReport({ ...report, firstAt: "2026-10-14" })).not.toContain("Window:");
  });

  it("supports missing optional legacy metadata and incomplete budget counters", () => {
    const legacy = { ...event(), tool: null, phase: undefined, langs: undefined, at: undefined, budget: undefined } as unknown as ActivationEvent;
    const partial = { ...event(), budget: { allocated: 10 } } as unknown as ActivationEvent;
    const usedOnly = { ...event(), budget: { used: 5 } } as unknown as ActivationEvent;
    const report = buildTelemetryReport([legacy, partial, usedOnly], []);
    expect(report.tools).toEqual({ unknown: 1, fixture: 2 });
    expect(report.phases).toEqual({ unknown: 1, review: 2 });
    expect(report.langs).toEqual({});
    expect(report.budget).toEqual({ allocatedAvg: 3, usedAvg: 2, dropRate: 0 });
    expect(report.firstAt).toBe("2026-10-14T01:00:00.000Z");
  });

  it.each([0, 1, 2])("applies a top-list limit of %s without losing aggregate counts", limit => {
    const report = buildTelemetryReport([event({ selected: ["alpha", "zeta", "beta"], dropped: ["drop-z", "drop-a"] }), event({ selected: ["beta"], dropped: ["drop-a"] })], ["alpha", "beta", "never", "never", "drop-a"], limit);
    expect(report.selectedTotals).toEqual({ distinct: 3, total: 4 });
    expect(report.topSelected).toEqual([{ id: "beta", count: 2 }, { id: "alpha", count: 1 }, { id: "zeta", count: 1 }].slice(0, limit));
    expect(report.dropped).toEqual([{ id: "drop-a", count: 2 }, { id: "drop-z", count: 1 }].slice(0, limit));
    expect(report.neverSelected).toEqual(["never"]);
    expect(report.budget.dropRate).toBeCloseTo(3 / 7);
  });

  it("sorts tied tool, phase and language counts and reports the true time range", () => {
    const report = buildTelemetryReport([
      event({ at: "2026-10-15T00:00:00.000Z", tool: "zeta", phase: "ship", langs: ["rust"] }),
      event({ at: "2026-10-13T00:00:00.000Z", tool: "alpha", phase: "explore", langs: ["go"] }),
      event({ tool: "alpha", phase: "explore", langs: ["go"] }),
    ], []);
    const rendered = renderTelemetryReport(report);
    expect(rendered).toContain("Window: 2026-10-13T00:00:00.000Z → 2026-10-15T00:00:00.000Z");
    expect(rendered).toContain("Tools: alpha 2, zeta 1");
    const ties = renderTelemetryReport(buildTelemetryReport([event({ tool: "zeta", phase: "ship", langs: ["rust"] }), event({ tool: "alpha", phase: "explore", langs: ["go"] })], []));
    expect(ties).toContain("Tools: alpha 1, zeta 1");
    expect(ties).toContain("Phases: explore 1, ship 1");
    expect(ties).toContain("Languages: go 1, rust 1");
  });

  it("bounds never-triggered and dropped output after the minimum evidence threshold", () => {
    const never = Array.from({ length: 35 }, (_, index) => `never-${String(index).padStart(2, "0")}`);
    const dropped = Array.from({ length: 12 }, (_, index) => `drop-${String(index).padStart(2, "0")}`);
    const report = buildTelemetryReport(Array.from({ length: NEVER_TRIGGERED_MIN_ACTIVATIONS }, () => event({ dropped })), [...never, ...dropped]);
    const rendered = renderTelemetryReport(report);
    expect(report.dropped).toHaveLength(12);
    expect(rendered).toContain("drop-09");
    expect(rendered).not.toContain("drop-10");
    expect(rendered).toContain("never-29");
    expect(rendered).not.toContain("never-30");
    expect(rendered).toContain("… and 5 more");
    const none = renderTelemetryReport(buildTelemetryReport(Array.from({ length: NEVER_TRIGGERED_MIN_ACTIVATIONS }, () => event()), []));
    expect(none).toContain("Never triggered (0) — revisit triggers or retire:\n  (none)");
  });
});

describe("explicit local telemetry commands", () => {
  it("returns useful disabled and enabled empty states without inventing events", async () => {
    const disabled = await telemetryCommand({ action: "status" }, ctx);
    expect(disabled).toMatchObject({ enabled: false, event_count: 0, ok: true });
    await expect(stat(telemetryPaths(home).dir)).rejects.toMatchObject({ code: "ENOENT" });
    expect((await telemetryCommand({ action: "report" }, ctx)).message).toContain("Enable with");
    const enabled = await telemetryCommand({ action: "enable", confirm: true }, ctx);
    expect(enabled).toMatchObject({ enabled: true, event_count: 0 });
    expect(enabled.message).toContain("Events stay local");
    expect((await telemetryCommand({ action: "status" }, ctx)).message).toContain("Telemetry is enabled. 0 event(s) recorded.");
    expect((await telemetryCommand({ action: "report" }, ctx)).message).not.toContain("Enable with");
  });

  it("honors explicit and default report top limits", async () => {
    await telemetryCommand({ action: "enable", confirm: true }, ctx);
    await eventsFile([event({ selected: ["alpha", "beta"], dropped: ["unused"] }), event({ selected: ["alpha"] })]);
    const status = await telemetryCommand({ action: "status" }, ctx);
    expect(status.event_count).toBe(2);
    const limited = await telemetryCommand({ action: "report", top: 1 }, ctx);
    expect(limited).toMatchObject({ ok: true, event_count: 2, message: "Report over 2 activation(s)." });
    expect(limited.report).toContain("Top selected rules (1):");
    expect(limited.report).toContain("2  alpha");
    expect((await telemetryCommand({ action: "report" }, ctx)).report).toContain("Top selected rules (2):");
    expect((await telemetryCommand({ action: "report", top: 0 }, ctx)).report).toContain("Top selected rules (0):\n  (none)");
  });

  it("returns an unknown count for corrupt telemetry instead of a clean zero", async () => {
    const secret = "private prompt fixture";
    await eventsFile([secret]);
    const status = await telemetryCommand({ action: "status" }, ctx);
    const report = await telemetryCommand({ action: "report" }, ctx);
    expect(status).toMatchObject({ ok: false, event_count: null, error_code: "INVALID_DATA" });
    expect(report).toMatchObject({ ok: false, event_count: null, error_code: "INVALID_DATA" });
    expect(JSON.stringify([status, report])).not.toContain(secret);
  });

  it("requires confirmed disable and clear, preserves unrelated data and removes only local telemetry artifacts", async () => {
    await telemetryCommand({ action: "enable", confirm: true }, ctx);
    const paths = telemetryPaths(home);
    await eventsFile([event()]);
    await writeFile(`${paths.events}.1`, "rotation fixture");
    await writeFile(paths.key, Buffer.alloc(32, 1));
    const unrelated = join(paths.dir, "keep.txt");
    await writeFile(unrelated, "keep this fixture");
    const before = await readFile(paths.events, "utf-8");
    for (const action of ["disable", "clear"] as const) {
      await expect(telemetryCommand({ action, confirm: false }, ctx)).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
      expect(await readFile(paths.events, "utf-8")).toBe(before);
    }
    vi.stubEnv("SUPERSKILL_TELEMETRY", "1");
    const disabled = await telemetryCommand({ action: "disable", confirm: true }, ctx);
    expect(disabled).toMatchObject({ enabled: false, event_count: 1 });
    expect((await telemetryCommand({ action: "status" }, ctx)).enabled).toBe(false);
    expect(await readFile(paths.events, "utf-8")).toBe(before);
    expect(await telemetryCommand({ action: "clear", confirm: true }, ctx)).toMatchObject({ ok: true, event_count: 0, deleted_event_count: 1, enabled: false });
    for (const path of [paths.events, `${paths.events}.1`, paths.key]) await expect(stat(path)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readTelemetrySettings(paths)).toMatchObject({ enabled: false });
    expect(await readFile(unrelated, "utf-8")).toBe("keep this fixture");
  });

  it("rejects an unknown action without writing settings or events", async () => {
    await expect(telemetryCommand({ action: "unknown" } as never, ctx)).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
    await expect(stat(telemetryPaths(home).dir)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
