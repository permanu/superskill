// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildActivationEvent } from "./recorder.js";
import { buildTelemetryReport, readTelemetryEvents, renderTelemetryReport } from "./report.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "telemetry-report-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function event(overrides: Partial<Parameters<typeof buildActivationEvent>[0]> = {}) {
  return buildActivationEvent(
    {
      tool: "cli",
      project: "demo",
      prompt: "implement retry",
      phase: "implement",
      stack: ["rust"],
      langs: ["rust", "typescript"],
      budget: { allocated: 2000, used: 1000 },
      selected: ["rust-a", "rust-b"],
      principles: [],
      dropped: ["rust-c"],
      rulesTotal: 10,
      ...overrides,
    },
    new Date("2026-10-05T10:00:00.000Z")
  );
}

describe("readTelemetryEvents", () => {
  it("reads JSONL and counts malformed lines", async () => {
    const path = join(dir, "events.jsonl");
    await writeFile(
      path,
      [JSON.stringify(event()), "not-json", JSON.stringify({ type: "other" }), ""].join("\n"),
      "utf-8"
    );
    const result = await readTelemetryEvents(path);
    expect(result.events).toHaveLength(1);
    expect(result.malformed).toBe(2);
  });

  it("returns empty results for a missing file", async () => {
    expect(await readTelemetryEvents(join(dir, "nope.jsonl"))).toEqual({ events: [], malformed: 0 });
  });
});

describe("buildTelemetryReport", () => {
  it("aggregates selections, drops, budget, and never-selected rules", () => {
    const events = [
      event({ selected: ["rust-a", "rust-b"], dropped: ["rust-c"] }),
      event({ selected: ["rust-a"], dropped: ["rust-c", "rust-d"], tool: "mcp", langs: ["rust"] }),
    ];
    const report = buildTelemetryReport(events, ["rust-a", "rust-b", "rust-c", "rust-d", "rust-e"]);
    expect(report.activations).toBe(2);
    expect(report.topSelected[0]).toEqual({ id: "rust-a", count: 2 });
    expect(report.dropped[0]).toEqual({ id: "rust-c", count: 2 });
    expect(report.neverSelected).toEqual(["rust-e"]);
    expect(report.budget.usedAvg).toBe(1000);
    expect(report.budget.dropRate).toBeCloseTo(3 / 6);
    expect(report.tools).toEqual({ cli: 1, mcp: 1 });
    expect(report.langs.rust).toBe(2);
    expect(report.langs.typescript).toBe(1);
  });

  it("renders a readable report", () => {
    const report = buildTelemetryReport([event()], ["rust-a", "rust-b", "rust-z"]);
    const text = renderTelemetryReport(report);
    expect(text).toContain("Telemetry report");
    expect(text).toContain("rust-a");
    expect(text).toContain("Never triggered");
    expect(text).toContain("rust-z");
  });
});
