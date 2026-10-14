import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandContext } from "../core/types.js";
import { telemetryCommand } from "./telemetry.js";
import { readTelemetrySettings, telemetryPaths } from "../telemetry/recorder.js";

let home: string;
let oldHome: string | undefined;
let oldTelemetry: string | undefined;
const ctx = {} as CommandContext;
beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "telemetry-command-"));
  oldHome = process.env.HOME;
  oldTelemetry = process.env.SUPERSKILL_TELEMETRY;
  process.env.HOME = home;
  delete process.env.SUPERSKILL_TELEMETRY;
});
afterEach(async () => {
  if (oldHome === undefined) delete process.env.HOME; else process.env.HOME = oldHome;
  if (oldTelemetry === undefined) delete process.env.SUPERSKILL_TELEMETRY; else process.env.SUPERSKILL_TELEMETRY = oldTelemetry;
  await rm(home, { recursive: true, force: true });
});

describe("telemetry consent", () => {
  it.each(["enable", "disable", "clear"] as const)("requires explicit boolean confirmation for %s", async action => {
    await expect(telemetryCommand({ action }, ctx)).rejects.toThrow(/confirm/);
    await expect(telemetryCommand({ action, confirm: "true" as never }, ctx)).rejects.toThrow(/confirm/);
    await expect(stat(telemetryPaths(home).dir)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("reports the effective disabled state when the environment disables an enabled setting", async () => {
    process.env.SUPERSKILL_TELEMETRY = "0";
    const result = await telemetryCommand({ action: "enable", confirm: true }, ctx);
    expect(result.enabled).toBe(false);
    expect(result.message).toContain("SUPERSKILL_TELEMETRY");
    expect(await readTelemetrySettings(telemetryPaths(home))).toMatchObject({ enabled: true });
  });

  it("keeps an explicit disable effective even when the environment is on", async () => {
    process.env.SUPERSKILL_TELEMETRY = "1";
    await telemetryCommand({ action: "disable", confirm: true }, ctx);
    const result = await telemetryCommand({ action: "status" }, ctx);
    expect(result.enabled).toBe(false);
  });

  it("does not follow an unreadable events symlink or claim a zero count", async () => {
    const paths = telemetryPaths(home);
    const secret = "private prompt fixture";
    const target = join(home, "private-events.jsonl");
    await mkdir(paths.dir, { recursive: true });
    await writeFile(target, secret);
    await symlink(target, paths.events);

    const status = await telemetryCommand({ action: "status" }, ctx);
    const report = await telemetryCommand({ action: "report" }, ctx);
    expect(status).toMatchObject({ ok: false, event_count: null, error_code: "ELOOP" });
    expect(report).toMatchObject({ ok: false, event_count: null, error_code: "ELOOP" });
    expect(JSON.stringify([status, report])).not.toContain(secret);

    const cleared = await telemetryCommand({ action: "clear", confirm: true }, ctx);
    expect(cleared).toMatchObject({ ok: true, event_count: 0, deleted_event_count: null, error_code: "ELOOP" });
    expect(cleared.message).toContain("prior event count is unknown");
    expect(await readFile(target, "utf-8")).toBe(secret);
    await expect(stat(paths.events)).rejects.toMatchObject({ code: "ENOENT" });
    expect(JSON.stringify(cleared)).not.toContain(secret);
  });

  it("lets confirmed clear remove corrupt data without inventing a deletion count", async () => {
    const paths = telemetryPaths(home);
    const secret = "private prompt fixture";
    await mkdir(paths.dir, { recursive: true });
    await writeFile(paths.events, secret);

    const result = await telemetryCommand({ action: "clear", confirm: true }, ctx);
    expect(result).toMatchObject({ ok: true, event_count: 0, deleted_event_count: null, error_code: "INVALID_DATA" });
    expect(result.message).toContain("prior event count is unknown");
    expect(JSON.stringify(result)).not.toContain(secret);
    await expect(stat(paths.events)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
