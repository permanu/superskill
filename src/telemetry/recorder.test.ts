// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildActivationEvent,
  hashTask,
  isTelemetryEnabled,
  readTelemetrySettings,
  recordTelemetryEvent,
  telemetryPaths,
  writeTelemetrySettings,
} from "./recorder.js";

let home: string;

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "telemetry-home-"));
});

afterEach(async () => {
  await rm(home, { recursive: true, force: true });
  delete process.env.SUPERSKILL_TELEMETRY;
});

const sampleEvent = () =>
  buildActivationEvent({
    tool: "cli",
    project: "demo",
    prompt: "add async retry to the HTTP client",
    phase: "implement",
    stack: ["rust"],
    langs: ["rust"],
    budget: { allocated: 2000, used: 800 },
    selected: ["rust-err-context-chain"],
    principles: [],
    dropped: ["rust-err-source-chain"],
    rulesTotal: 262,
  });

describe("telemetry settings", () => {
  it("is disabled by default and writes nothing", async () => {
    const paths = telemetryPaths(home);
    expect(await isTelemetryEnabled(paths)).toBe(false);
    expect(await recordTelemetryEvent(sampleEvent(), paths)).toBe(false);
    await expect(stat(paths.events)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(stat(paths.key)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await isTelemetryEnabled(paths, { SUPERSKILL_TELEMETRY: "1" })).toBe(true);
  });

  it("persists enable/disable settings", async () => {
    const paths = telemetryPaths(home);
    await writeTelemetrySettings(true, paths);
    expect(await readTelemetrySettings(paths)).toMatchObject({ enabled: true });
    expect(await isTelemetryEnabled(paths)).toBe(true);
    await writeTelemetrySettings(false, paths);
    expect(await isTelemetryEnabled(paths)).toBe(false);
  });

  it("lets the environment disable recording but never override an explicit persisted opt-out", async () => {
    const paths = telemetryPaths(home);
    await writeTelemetrySettings(true, paths);
    expect(await isTelemetryEnabled(paths, { SUPERSKILL_TELEMETRY: "0" })).toBe(false);
    await writeTelemetrySettings(false, paths);
    expect(await isTelemetryEnabled(paths, { SUPERSKILL_TELEMETRY: "on" })).toBe(false);
    expect(await isTelemetryEnabled(paths, { SUPERSKILL_TELEMETRY: "bogus" })).toBe(false);
  });
});

describe("recordTelemetryEvent", () => {
  it("appends JSONL events when enabled and never stores the raw prompt", async () => {
    const paths = telemetryPaths(home);
    await writeTelemetrySettings(true, paths);
    const event = sampleEvent();
    expect(await recordTelemetryEvent(event, paths)).toBe(true);
    const raw = await readFile(paths.events, "utf-8");
    expect(raw.trim().split("\n")).toHaveLength(1);
    expect(raw).not.toContain("add async retry");
    const parsed = JSON.parse(raw.trim());
    expect(parsed.type).toBe("activation");
    expect(parsed.task_hash).toMatch(/^hmac-sha256:[0-9a-f]{32}$/);
    expect(parsed.selected).toEqual(["rust-err-context-chain"]);
  });

  it("uses private per-install keys and keeps prompt identities stable only within that installation", async () => {
    const first = telemetryPaths(home);
    const second = telemetryPaths(join(home, "other-install"));
    await writeTelemetrySettings(true, first);
    await writeTelemetrySettings(true, second);
    await recordTelemetryEvent(sampleEvent(), first);
    await recordTelemetryEvent(sampleEvent(), first);
    await recordTelemetryEvent(sampleEvent(), second);
    const hashes = (await readFile(first.events, "utf-8")).trim().split("\n").map(line => JSON.parse(line).task_hash);
    const otherHash = JSON.parse((await readFile(second.events, "utf-8")).trim()).task_hash;
    expect(hashes[0]).toBe(hashes[1]);
    expect(hashes[0]).not.toBe(otherHash);
    expect((await stat(first.key)).mode & 0o777).toBe(0o600);
    expect(hashes[0]).not.toBe(hashTask("add async retry to the HTTP client"));
  });

  it("never contacts the network", async () => {
    const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network forbidden"));
    try {
      const paths = telemetryPaths(home);
      await writeTelemetrySettings(true, paths);
      expect(await recordTelemetryEvent(sampleEvent(), paths)).toBe(true);
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); }
  });

  it("rotates the events file once it exceeds the size cap", async () => {
    const paths = telemetryPaths(home);
    await writeTelemetrySettings(true, paths);
    await recordTelemetryEvent(sampleEvent(), paths, 10);
    expect(await recordTelemetryEvent(sampleEvent(), paths, 10)).toBe(true);
    await expect(stat(`${paths.events}.1`)).resolves.toBeTruthy();
    const current = await readFile(paths.events, "utf-8");
    expect(current.trim().split("\n")).toHaveLength(1);
  });

  it("creates the telemetry dir 0700 and files 0600, including the rotation backup", async () => {
    const paths = telemetryPaths(home);
    await writeTelemetrySettings(true, paths);
    expect(await recordTelemetryEvent(sampleEvent(), paths, 10)).toBe(true);
    await recordTelemetryEvent(sampleEvent(), paths, 10);
    expect((await stat(paths.dir)).mode & 0o777).toBe(0o700);
    expect((await stat(paths.settings)).mode & 0o777).toBe(0o600);
    expect((await stat(paths.events)).mode & 0o777).toBe(0o600);
    expect((await stat(`${paths.events}.1`)).mode & 0o777).toBe(0o600);
  });

  it("tightens pre-existing loose permissions on dir, events, and backup", async () => {
    const paths = telemetryPaths(home);
    await mkdir(paths.dir, { recursive: true, mode: 0o755 });
    await chmod(paths.dir, 0o755);
    await writeTelemetrySettings(true, paths);
    await writeFile(paths.events, "", { mode: 0o644 });
    await chmod(paths.events, 0o644);
    await recordTelemetryEvent(sampleEvent(), paths, 10);
    await recordTelemetryEvent(sampleEvent(), paths, 10);
    expect((await stat(paths.dir)).mode & 0o777).toBe(0o700);
    expect((await stat(paths.events)).mode & 0o777).toBe(0o600);
    expect((await stat(`${paths.events}.1`)).mode & 0o777).toBe(0o600);
  });

  it("swallows storage failures instead of throwing", async () => {
    const paths = telemetryPaths(join(home, "missing", "\u0000"));
    await writeFile(join(home, "note.txt"), "x");
    await writeTelemetrySettings(true, telemetryPaths(home));
    await expect(recordTelemetryEvent(sampleEvent(), paths)).resolves.toBe(false);
  });
});

describe("hashTask", () => {
  it("is deterministic, prefixed, and does not reveal the prompt", () => {
    const hash = hashTask("token=super-secret");
    expect(hash).toBe(hashTask("token=super-secret"));
    expect(hash).toMatch(/^hmac-sha256:[0-9a-f]{32}$/);
    expect(hash).not.toContain("super-secret");
    expect(hash).not.toBe(hashTask("other prompt"));
    expect(hashTask("token=super-secret", Buffer.alloc(32, 1))).not.toBe(hashTask("token=super-secret", Buffer.alloc(32, 2)));
  });
});
