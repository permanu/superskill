// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { rmdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { backupOnce, readTextSafe, writeTextAtomic } from "./helpers.js";
import type { AdapterActionResult, AdapterContext, HostAdapter } from "./types.js";

const LOG_PREFIX = "[host-adapters]";
export const OPENCODE_PLUGIN_MARKER = "// superskill worktree plugin";

export function opencodePluginPath(ctx: AdapterContext): string {
  return join(ctx.repoRoot, ".opencode", "plugins", "superskill-worktree.js");
}

export function opencodePluginContent(): string {
  return (
    [
      OPENCODE_PLUGIN_MARKER,
      'import { execFile } from "node:child_process";',
      "",
      "async function applyWorktreeEnv(env) {",
      "  try {",
      '    const cli = process.env.SUPERSKILL_CLI ?? "superskill-cli";',
      "    const stdout = await new Promise((resolve, reject) => {",
      '      execFile(cli, ["worktree", "env", "--json"], { encoding: "utf8" }, (error, output) => {',
      "        if (error) reject(error);",
      "        else resolve(output);",
      "      });",
      "    });",
      "    Object.assign(env, JSON.parse(stdout));",
      "  } catch {}",
      "}",
      "",
      "export default {",
      '  id: "superskill.worktree",',
      "  async setup(ctx) {",
      '    await ctx.shell.hook("create.before", async (event) => {',
      "      event.env ??= {};",
      "      await applyWorktreeEnv(event.env);",
      "    });",
      "  },",
      "  async server() {",
      "    return {",
      '      "shell.env": async (_input, output) => {',
      "        output.env ??= {};",
      "        await applyWorktreeEnv(output.env);",
      "      },",
      "    };",
      "  },",
      "};",
    ].join("\n") + "\n"
  );
}

type OpenCodeMode = "plan" | "install" | "uninstall";

async function runOpenCode(
  ctx: AdapterContext,
  mode: OpenCodeMode,
): Promise<AdapterActionResult> {
  const file = opencodePluginPath(ctx);
  const dryRun = mode === "plan";
  const result: AdapterActionResult = { adapter: "opencode", changed: false, dryRun, files: [], notes: [] };
  const existing = await readTextSafe(file);

  if (existing !== null && !existing.includes(OPENCODE_PLUGIN_MARKER)) {
    result.notes.push(`existing plugin lacks superskill marker; left unchanged: ${file}`);
    return result;
  }

  if (mode === "uninstall") {
    if (existing === null) return result;
    result.changed = true;
    result.files.push(file);
    if (dryRun) {
      result.notes.push(`would remove ${file}`);
      return result;
    }
    await rm(file, { force: true });
    const pluginsDir = dirname(file);
    try {
      await rmdir(pluginsDir);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOTEMPTY" && code !== "ENOENT") {
        console.error(`${LOG_PREFIX} cannot remove ${pluginsDir}: ${code ?? String(err)}`);
      }
    }
    result.notes.push(`removed ${file}`);
    return result;
  }

  const content = opencodePluginContent();
  if (existing === content) return result;
  result.changed = true;
  result.files.push(file);
  if (dryRun) {
    result.notes.push(`would write ${file}`);
    return result;
  }
  if (existing !== null) await backupOnce(file);
  await writeTextAtomic(file, content);
  result.notes.push(`wrote ${file}`);
  return result;
}

export const opencodeAdapter: HostAdapter = {
  id: "opencode",
  displayName: "OpenCode",
  detect: async () =>
    existsSync(join(process.cwd(), ".opencode")) ||
    existsSync(join(homedir(), ".config", "opencode")),
  plan: (ctx) => runOpenCode(ctx, "plan"),
  install: (ctx) => runOpenCode(ctx, "install"),
  uninstall: (ctx) => runOpenCode(ctx, "uninstall"),
};
