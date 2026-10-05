// SPDX-License-Identifier: Apache-2.0

import { rm } from "node:fs/promises";
import type { CommandContext } from "../core/types.js";
import { loadRules } from "../rules/loader.js";
import { isTelemetryEnabled, telemetryPaths, writeTelemetrySettings } from "../telemetry/recorder.js";
import { buildTelemetryReport, readTelemetryEvents, renderTelemetryReport } from "../telemetry/report.js";

export type TelemetryAction = "status" | "enable" | "disable" | "report" | "clear";

export interface TelemetryCommandArgs {
  action: TelemetryAction;
  /** Cap for the top-selected / most-dropped lists (default 20). */
  top?: number;
}

export interface TelemetryCommandResult {
  ok: boolean;
  action: TelemetryAction;
  enabled: boolean;
  message: string;
  events_path: string;
  event_count: number;
  report?: string;
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
  const paths = telemetryPaths();
  const enabled = await isTelemetryEnabled(paths);
  const base = { action: args.action, enabled, events_path: paths.events };

  switch (args.action) {
    case "enable": {
      await writeTelemetrySettings(true, paths);
      return {
        ...base,
        ok: true,
        enabled: true,
        event_count: (await readTelemetryEvents(paths.events)).events.length,
        message: `Telemetry enabled. Events stay local in ${paths.events}. Disable with \`superskill telemetry disable\`.`,
      };
    }
    case "disable": {
      await writeTelemetrySettings(false, paths);
      return {
        ...base,
        ok: true,
        enabled: false,
        event_count: (await readTelemetryEvents(paths.events)).events.length,
        message: "Telemetry disabled. Existing local events are untouched; use `superskill telemetry clear` to delete them.",
      };
    }
    case "status": {
      const { events, malformed } = await readTelemetryEvents(paths.events);
      const state = enabled ? "enabled" : "disabled";
      const suffix = malformed > 0 ? ` (${malformed} malformed line(s) ignored)` : "";
      return {
        ...base,
        ok: true,
        event_count: events.length,
        message: `Telemetry is ${state}. ${events.length} event(s) recorded${suffix}. File: ${paths.events}`,
      };
    }
    case "report": {
      const { events, malformed } = await readTelemetryEvents(paths.events);
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
      report.malformed = malformed;
      return {
        ...base,
        ok: true,
        event_count: events.length,
        report: renderTelemetryReport(report),
        message: `Report over ${events.length} activation(s).`,
      };
    }
    case "clear": {
      const { events } = await readTelemetryEvents(paths.events);
      await rm(paths.events, { force: true });
      await rm(`${paths.events}.1`, { force: true });
      return {
        ...base,
        ok: true,
        event_count: 0,
        message: `Deleted ${events.length} local event(s) and any rotation backup.`,
      };
    }
    default: {
      throw new Error(`Unknown telemetry action "${(args as { action: string }).action}"`);
    }
  }
}
