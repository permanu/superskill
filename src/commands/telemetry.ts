// SPDX-License-Identifier: Apache-2.0

import { rm } from "node:fs/promises";
import type { CommandContext } from "../core/types.js";
import { VaultError } from "../lib/vault-fs.js";
import { loadRules } from "../rules/loader.js";
import { isTelemetryEnabled, telemetryPaths, writeTelemetrySettings } from "../telemetry/recorder.js";
import { buildTelemetryReport, readTelemetryEvents, renderTelemetryReport, TelemetryReadError } from "../telemetry/report.js";

export type TelemetryAction = "status" | "enable" | "disable" | "report" | "clear";

export interface TelemetryCommandArgs {
  action: TelemetryAction;
  /** Cap for the top-selected / most-dropped lists (default 20). */
  top?: number;
  confirm?: boolean;
}

export interface TelemetryCommandResult {
  ok: boolean;
  action: TelemetryAction;
  enabled: boolean;
  message: string;
  events_path: string;
  event_count: number | null;
  deleted_event_count?: number | null;
  error_code?: string;
  report?: string;
}

async function readEventCount(paths: ReturnType<typeof telemetryPaths>): Promise<{ count: number | null; errorCode?: string }> {
  try {
    return { count: (await readTelemetryEvents(paths.events)).events.length };
  } catch (error) {
    return { count: null, errorCode: error instanceof TelemetryReadError ? error.code : "UNKNOWN" };
  }
}

function unavailableMessage(code: string, path: string): string {
  return `Telemetry event data unavailable (${code}); event count is unknown. File: ${path}`;
}

/**
 * Local, opt-in telemetry for rule-selection effectiveness. Events never leave
 * the machine (append-only JSONL under ~/.superskill/telemetry). Disabled by
 * default; `enable` (or SUPERSKILL_TELEMETRY=1) is the explicit opt-in.
 */
export async function telemetryCommand(
  args: TelemetryCommandArgs,
  _ctx: CommandContext
): Promise<TelemetryCommandResult> {
  if (["enable", "disable", "clear"].includes(args.action) && args.confirm !== true) {
    throw new VaultError("INVALID_ARGUMENT", `Telemetry ${args.action} requires confirm: true.`);
  }
  const paths = telemetryPaths();
  const enabled = await isTelemetryEnabled(paths);
  const base = { action: args.action, enabled, events_path: paths.events };

  switch (args.action) {
    case "enable": {
      await writeTelemetrySettings(true, paths);
      const effective = await isTelemetryEnabled(paths);
      const count = await readEventCount(paths);
      return {
        ...base,
        ok: true,
        enabled: effective,
        event_count: count.count,
        ...(count.errorCode ? { error_code: count.errorCode } : {}),
        message: count.errorCode
          ? `${unavailableMessage(count.errorCode, paths.events)} ${effective ? "Telemetry remains local and enabled." : "The saved opt-in is overridden by SUPERSKILL_TELEMETRY."}`
          : effective
            ? `Telemetry enabled. Events stay local in ${paths.events}. Disable with \`superskill telemetry disable\`.`
            : "Telemetry opt-in saved, but SUPERSKILL_TELEMETRY currently disables recording.",
      };
    }
    case "disable": {
      await writeTelemetrySettings(false, paths);
      const count = await readEventCount(paths);
      return {
        ...base,
        ok: true,
        enabled: false,
        event_count: count.count,
        ...(count.errorCode ? { error_code: count.errorCode } : {}),
        message: count.errorCode
          ? `${unavailableMessage(count.errorCode, paths.events)} Telemetry is disabled; existing files were not changed.`
          : "Telemetry disabled. Existing local events are untouched; use `superskill telemetry clear` to delete them.",
      };
    }
    case "status": {
      const count = await readEventCount(paths);
      if (count.errorCode) {
        return { ...base, ok: false, event_count: null, error_code: count.errorCode, message: unavailableMessage(count.errorCode, paths.events) };
      }
      const state = enabled ? "enabled" : "disabled";
      return {
        ...base,
        ok: true,
        event_count: count.count,
        message: `Telemetry is ${state}. ${count.count} event(s) recorded. File: ${paths.events}`,
      };
    }
    case "report": {
      let events: Awaited<ReturnType<typeof readTelemetryEvents>>["events"];
      try {
        ({ events } = await readTelemetryEvents(paths.events));
      } catch (error) {
        const code = error instanceof TelemetryReadError ? error.code : "UNKNOWN";
        return { ...base, ok: false, event_count: null, error_code: code, message: unavailableMessage(code, paths.events) };
      }
      if (events.length === 0) {
        return {
          ...base,
          ok: true,
          event_count: 0,
          message: `No telemetry events recorded yet. ${enabled ? "" : "Enable with `superskill telemetry enable`. "}File: ${paths.events}`,
        };
      }
      const { rules } = await loadRules();
      const report = buildTelemetryReport(events, rules.map((rule) => rule.id), args.top ?? 20);
      return {
        ...base,
        ok: true,
        event_count: events.length,
        report: renderTelemetryReport(report),
        message: `Report over ${events.length} activation(s).`,
      };
    }
    case "clear": {
      const count = await readEventCount(paths);
      await rm(paths.events, { force: true });
      await rm(`${paths.events}.1`, { force: true });
      await rm(paths.key, { force: true });
      return {
        ...base,
        ok: true,
        event_count: 0,
        deleted_event_count: count.count,
        ...(count.errorCode ? { error_code: count.errorCode } : {}),
        message: count.errorCode
          ? `Cleared the local event log, rotation backup, and HMAC key; prior event count is unknown (${count.errorCode}).`
          : `Cleared ${count.count} event(s) from the active local log and removed any rotation backup and HMAC key.`,
      };
    }
    default: {
      throw new VaultError("INVALID_ARGUMENT", `Unknown telemetry action "${(args as { action: string }).action}"`);
    }
  }
}
