// SPDX-License-Identifier: Apache-2.0
import { claudeAdapter } from "./claude.js";
import { codexAdapter } from "./codex.js";
import { cursorAdapter } from "./cursor.js";
import { geminiAdapter } from "./gemini.js";
import { genericAdapter } from "./generic.js";
import { grokbuildAdapter } from "./grokbuild.js";
import { opencodeAdapter } from "./opencode.js";
import type { AdapterActionResult, AdapterContext, HostAdapter } from "./types.js";

export {
  BACKUP_SUFFIX,
  backupOnce,
  containsSuperskillBootstrap,
  createHookAdapter,
  isSuperskillBootstrapCommand,
  readJsonSafe,
  readTextSafe,
  writeJsonAtomic,
  writeTextAtomic,
} from "./helpers.js";
export type { HookAdapterSpec } from "./helpers.js";

const LOG_PREFIX = "[host-adapters]";

export const ALL_ADAPTERS: HostAdapter[] = [
  claudeAdapter,
  opencodeAdapter,
  codexAdapter,
  cursorAdapter,
  geminiAdapter,
  grokbuildAdapter,
  genericAdapter,
];

export function adapterById(id: string): HostAdapter | undefined {
  return ALL_ADAPTERS.find((adapter) => adapter.id === id);
}

export async function detectAdapters(): Promise<HostAdapter[]> {
  const candidates = ALL_ADAPTERS.filter((adapter) => adapter.id !== "generic");
  const outcomes = await Promise.all(
    candidates.map(async (adapter) => {
      try {
        return (await adapter.detect()) ? adapter : null;
      } catch (err) {
        console.error(`${LOG_PREFIX} detect failed for ${adapter.id}: ${String(err)}`);
        return null;
      }
    }),
  );
  const detected = outcomes.filter((adapter): adapter is HostAdapter => adapter !== null);
  if (detected.length > 0) return detected;
  return [genericAdapter];
}

type AdapterMode = "plan" | "install" | "uninstall";

function unknownAdapterResult(id: string, dryRun: boolean): AdapterActionResult {
  return { adapter: id, changed: false, dryRun, files: [], notes: ["unknown adapter"] };
}

async function runAdapters(
  ctx: AdapterContext,
  ids: string[] | undefined,
  mode: AdapterMode,
): Promise<AdapterActionResult[]> {
  const targets: Array<HostAdapter | string> = [];
  if (ids === undefined) {
    targets.push(...(await detectAdapters()));
  } else {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      targets.push(adapterById(id) ?? id);
    }
  }

  const results: AdapterActionResult[] = [];
  for (const target of targets) {
    if (typeof target === "string") {
      results.push(unknownAdapterResult(target, mode === "plan"));
      continue;
    }
    if (mode === "plan") results.push(await target.plan(ctx));
    else if (mode === "install") results.push(await target.install(ctx));
    else results.push(await target.uninstall(ctx));
  }
  return results;
}

export function planAdapters(
  ctx: AdapterContext,
  ids?: string[],
): Promise<AdapterActionResult[]> {
  return runAdapters(ctx, ids, "plan");
}

export function installAdapters(
  ctx: AdapterContext,
  ids?: string[],
): Promise<AdapterActionResult[]> {
  return runAdapters(ctx, ids, "install");
}

export function uninstallAdapters(
  ctx: AdapterContext,
  ids?: string[],
): Promise<AdapterActionResult[]> {
  return runAdapters(ctx, ids, "uninstall");
}
