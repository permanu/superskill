// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { rmdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { backupOnce, readTextSafe, requireSafePath, unsafePathReason, writeTextAtomic } from "./helpers.js";
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
      'import { fileURLToPath } from "node:url";',
      "",
      'const repoRoot = fileURLToPath(new URL("../../", import.meta.url));',
      "const ENV_TIMEOUT_MS = 5000;",
      "",
      "async function applyWorktreeEnv(env, cwd = repoRoot) {",
      "  try {",
      '    const cli = process.env.SUPERSKILL_CLI ?? "superskill-cli";',
      "    const stdout = await new Promise((resolve, reject) => {",
      '      execFile(cli, ["worktree", "env", "--json"], { cwd, encoding: "utf8", timeout: ENV_TIMEOUT_MS, killSignal: "SIGKILL", maxBuffer: 1024 * 1024 }, (error, output) => {',
      "        if (error) reject(error);",
      "        else resolve(output);",
      "      });",
      "    });",
      "    const vars = JSON.parse(stdout)?.json;",
      '    if (!vars || typeof vars !== "object" || Array.isArray(vars)) return;',
      "    for (const [name, value] of Object.entries(vars)) {",
      '      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || ["__proto__", "constructor", "prototype"].includes(name)) continue;',
      '      if (typeof value === "string" && !value.includes("\\0")) env[name] = value;',
      "    }",
      '  } catch (error) { console.error("[superskill-worktree] could not resolve shell environment:", error instanceof Error ? error.message : String(error)); }',
      "}",
      "",
      "export default {",
      '  id: "superskill.worktree",',
      "  async setup(ctx) {",
      '    await ctx.shell.hook("create.before", async (event) => {',
      "      event.env ??= {};",
      "      await applyWorktreeEnv(event.env, event.cwd ?? ctx.location?.directory ?? repoRoot);",
      "    });",
      "  },",
      "  async server() {",
      "    return {",
      '      "shell.env": async (_input, output) => {',
      "        output.env ??= {};",
      "        await applyWorktreeEnv(output.env, _input?.cwd ?? repoRoot);",
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
  const unsafe = await unsafePathReason(file, ctx.repoRoot) ?? await unsafePathReason(`${file}.bak.superskill`, ctx.repoRoot);
  if (unsafe !== null) {
    result.notes.push(unsafe);
    return result;
  }
  const existing = await readTextSafe(file);

  if (existing !== null && !existing.includes(OPENCODE_PLUGIN_MARKER)) {
    result.notes.push(`existing plugin lacks superskill marker; left unchanged: ${file}`);
    return result;
  }

  if (mode === "uninstall") {
    if (existing === null) return result;
    if (existing !== opencodePluginContent()) {
      result.notes.push(`modified plugin left unchanged: ${file}`);
      return result;
    }
    result.changed = true;
    result.files.push(file);
    if (dryRun) {
      result.notes.push(`would remove ${file}`);
      return result;
    }
    await requireSafePath(file, ctx.repoRoot);
    if (await readTextSafe(file) !== existing) throw new Error(`${file} changed during uninstall; left unchanged`);
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
  if (existing !== null) await backupOnce(file, ctx.repoRoot);
  await writeTextAtomic(file, content, 0o600, ctx.repoRoot, existing);
  result.notes.push(`wrote ${file}`);
  return result;
}

export const opencodeAdapter: HostAdapter = {
  id: "opencode",
  displayName: "OpenCode",
  detect: async (ctx) =>
    existsSync(join(ctx?.repoRoot ?? process.cwd(), ".opencode")) ||
    existsSync(join(homedir(), ".config", "opencode")),
  plan: (ctx) => runOpenCode(ctx, "plan"),
  install: (ctx) => runOpenCode(ctx, "install"),
  uninstall: (ctx) => runOpenCode(ctx, "uninstall"),
};
