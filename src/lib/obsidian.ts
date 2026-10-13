// SPDX-License-Identifier: Apache-2.0

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export interface ObsidianLaunch {
  ok: boolean;
  reason?: string;
}

export interface GraphScopeResult {
  ok: boolean;
  reason?: string;
}

const LAUNCH_TIMEOUT_MS = 3_000;

export function obsidianAppInstalled(
  opts: { platform?: NodeJS.Platform; exists?: (path: string) => boolean } = {},
): boolean {
  const platform = opts.platform ?? process.platform;
  if (platform !== "darwin") return true;
  const exists = opts.exists ?? existsSync;
  return ["/Applications/Obsidian.app", join(homedir(), "Applications", "Obsidian.app")].some((candidate) =>
    exists(candidate),
  );
}

export function obsidianDeepLink(vaultName: string, file?: string | null): string {
  const base = `obsidian://open?vault=${encodeURIComponent(vaultName)}`;
  return file ? `${base}&file=${encodeURIComponent(file)}` : base;
}

function launchUrl(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    try {
      const child = spawn(command, args, { stdio: "ignore" });
      child.once("error", () => finish(false));
      child.once("exit", (code) => finish(code === 0));
      setTimeout(() => finish(true), LAUNCH_TIMEOUT_MS).unref();
    } catch {
      finish(false);
    }
  });
}

export async function openInObsidian(url: string): Promise<ObsidianLaunch> {
  if (!obsidianAppInstalled()) {
    return { ok: false, reason: "Obsidian.app is not installed" };
  }
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const ok = await launchUrl(command, args);
  return ok ? { ok: true } : { ok: false, reason: `could not launch ${command}` };
}

export async function scopeGraphFilter(vaultRoot: string, project: string): Promise<GraphScopeResult> {
  const graphPath = join(vaultRoot, ".obsidian", "graph.json");
  if (!existsSync(graphPath)) {
    return { ok: false, reason: "vault has not been opened in Obsidian yet (no .obsidian/graph.json)" };
  }
  let raw: string;
  try {
    raw = await readFile(graphPath, "utf8");
  } catch (e: unknown) {
    console.error("[obsidian] could not read .obsidian/graph.json:", e);
    return { ok: false, reason: "could not read .obsidian/graph.json" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "graph.json is not valid JSON; left unchanged" };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "graph.json is not a JSON object; left unchanged" };
  }
  const graph = parsed as Record<string, unknown>;
  graph.search = `path:projects/${project}`;
  try {
    await writeFile(graphPath, `${JSON.stringify(graph, null, 2)}\n`);
  } catch (e: unknown) {
    console.error("[obsidian] could not write .obsidian/graph.json:", e);
    return { ok: false, reason: "could not write .obsidian/graph.json" };
  }
  return { ok: true };
}
