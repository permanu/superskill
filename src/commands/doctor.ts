// SPDX-License-Identifier: Apache-2.0

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { readdir, readFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { CommandContext } from "../core/types.js";
import { detectProject, getGitRoot } from "../lib/project-detector.js";
import { probeTool } from "../rules/harness/common.js";
import { rulesCatalogRoot } from "../rules/loader.js";
import { validateAll } from "../rules/validate.js";
import { detectClients } from "../setup/detect.js";
import { readJsonConfig } from "../setup/json-config.js";
import type { DetectedClient } from "../setup/types.js";
import { isTelemetryEnabled, telemetryPaths } from "../telemetry/recorder.js";
import { readTelemetryEvents } from "../telemetry/report.js";
import { isHookInstalled } from "../lib/worktree/hooks.js";
import { readPolicy } from "../lib/worktree/state.js";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

export type CheckStatus = "ok" | "warn" | "fail" | "skip";

export interface DoctorCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  hint?: string;
}

export interface DoctorResult {
  version: string;
  healthy: boolean;
  summary: Record<CheckStatus, number>;
  checks: DoctorCheck[];
}

export interface DoctorOptions {
  /** Skip the catalog schema validation (slower). */
  skipCatalog?: boolean;
  /** Skip toolchain probes. */
  skipToolchains?: boolean;
}

function check(
  id: string,
  label: string,
  status: CheckStatus,
  detail: string,
  hint?: string
): DoctorCheck {
  return hint === undefined ? { id, label, status, detail } : { id, label, status, detail, hint };
}

export function summarizeChecks(checks: readonly DoctorCheck[]): Record<CheckStatus, number> {
  const summary: Record<CheckStatus, number> = { ok: 0, warn: 0, fail: 0, skip: 0 };
  for (const entry of checks) summary[entry.status] += 1;
  return summary;
}

function packageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
}

function packageVersion(): string {
  try {
    return (require("../../package.json") as { version: string }).version;
  } catch {
    return "unknown";
  }
}

export interface McpProcess {
  pid: string;
  started: Date;
  command: string;
}

/** Parse `ps -axo lstart=,pid=,command=` output for running MCP servers. */
export function parseMcpProcesses(psOutput: string): McpProcess[] {
  const out: McpProcess[] = [];
  for (const line of psOutput.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 7) continue;
    const command = tokens.slice(6).join(" ");
    const last = command.split(/\s+/).pop() ?? "";
    if (last !== "superskill" && !last.endsWith("/superskill")) continue;
    const started = new Date(tokens.slice(0, 5).join(" "));
    if (Number.isNaN(started.getTime())) continue;
    out.push({ pid: tokens[5], started, command });
  }
  return out;
}

async function listMcpProcesses(): Promise<McpProcess[]> {
  if (process.platform === "win32") return [];
  try {
    const { stdout } = await execFileAsync("ps", ["-axo", "lstart=,pid=,command="], { timeout: 3000 });
    return parseMcpProcesses(stdout);
  } catch {
    return [];
  }
}

async function git(cwd: string, args: string[]): Promise<{ code: number; stdout: string }> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd, timeout: 3000 });
    return { code: 0, stdout };
  } catch (e) {
    const err = e as { code?: unknown; stdout?: string };
    return { code: typeof err.code === "number" ? err.code : 1, stdout: err.stdout ?? "" };
  }
}

function clientHasSuperskillEntry(client: DetectedClient): boolean {
  try {
    if (client.config.configFormat === "toml") {
      const text = readFileSync(client.mcpConfigPath, "utf-8");
      return /\[mcp_servers\.superskill\]/.test(text);
    }
    const config = readJsonConfig(client.mcpConfigPath);
    if (config === null) return false;
    const root = config[client.config.rootKey];
    return typeof root === "object" && root !== null && "superskill" in (root as Record<string, unknown>);
  } catch {
    return false;
  }
}

const TOOLCHAIN_PROBES: ReadonlyArray<{ lang: string; cmd: string; args: string[] }> = [
  { lang: "rust", cmd: "rustc", args: ["--version"] },
  { lang: "rust", cmd: "cargo", args: ["--version"] },
  { lang: "typescript", cmd: "tsc", args: ["--version"] },
  { lang: "python", cmd: "python3", args: ["--version"] },
  { lang: "go", cmd: "go", args: ["version"] },
  { lang: "swift", cmd: "swiftc", args: ["--version"] },
  { lang: "java", cmd: "javac", args: ["--version"] },
  { lang: "c", cmd: "clang", args: ["--version"] },
  { lang: "cpp", cmd: "clang++", args: ["--version"] },
];

/**
 * Worktree-cache checks: shared policy, guarded post-checkout hook, and the
 * report-only default of `worktree gc`. Best-effort — a repo that never ran
 * activation simply gets the hint.
 */
export async function worktreeDoctorChecks(cwd: string): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  const policy = await readPolicy(cwd);
  checks.push(
    policy !== null
      ? check("worktree-policy", "Worktree policy", "ok", `active (repo ${policy.repoId})`)
      : check(
          "worktree-policy",
          "Worktree policy",
          "warn",
          "no shared worktree-cache policy in this repo",
          "run the `worktree_activate` MCP tool (or `superskill-cli worktree activate`); nothing is deleted"
        )
  );

  let hookInstalled = false;
  try {
    hookInstalled = await isHookInstalled(cwd);
  } catch (e) {
    console.error(`[doctor] worktree hook probe failed: ${(e as Error).message}`);
  }
  checks.push(
    hookInstalled
      ? check("worktree-hook", "Worktree hook", "ok", "guarded post-checkout bootstrap hook installed")
      : check(
          "worktree-hook",
          "Worktree hook",
          "warn",
          "post-checkout bootstrap hook not installed",
          "`worktree_activate` installs it; existing hooks are preserved and nothing is deleted"
        )
  );

  checks.push(
    check(
      "worktree-caches",
      "Worktree caches",
      "ok",
      "shared per-repo cache; `worktree gc` is report-only by default (deletion requires explicit flags)"
    )
  );

  return checks;
}

/**
 * One-shot health check across every layer: runtime, install vs running MCP
 * servers, vault + mapping, project graph isolation (must stay gitignored and
 * project-local), rules catalog, compile toolchains, telemetry, MCP clients.
 */
export async function doctorCommand(
  _args: Record<string, unknown>,
  ctx: CommandContext,
  options: DoctorOptions = {}
): Promise<DoctorResult> {
  const checks: DoctorCheck[] = [];
  const version = packageVersion();

  const [nodeMajor = 0, nodeMinor = 0] = process.versions.node
    .split(".")
    .map((part) => Number.parseInt(part, 10));
  const nodeOk = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 13);
  checks.push(
    nodeOk
      ? check("node", "Node runtime", "ok", `v${process.versions.node}`)
      : check(
          "node",
          "Node runtime",
          "fail",
          `v${process.versions.node} (requires >= 22.13)`,
          "superskill needs Node >= 22.13 for `node:sqlite`; upgrade Node"
        )
  );

  const root = packageRoot();
  let installedAt = new Date(0);
  try {
    installedAt = (await stat(join(root, "package.json"))).mtime;
  } catch {
    // keep epoch; freshness check will report unknown-vintage installs as stale
  }
  checks.push(check("install", "Install", "ok", `superskill ${version} at ${root} (installed ${installedAt.toISOString()})`));

  const processes = await listMcpProcesses();
  if (processes.length === 0) {
    checks.push(check("mcp-freshness", "MCP server freshness", "skip", "no running superskill MCP server found"));
  } else {
    const stale = processes.filter((entry) => entry.started.getTime() < installedAt.getTime());
    checks.push(
      stale.length > 0
        ? check(
            "mcp-freshness",
            "MCP server freshness",
            "warn",
            `${processes.length} running, ${stale.length} started before the current install`,
            "restart your AI clients so they spawn the updated MCP server"
          )
        : check("mcp-freshness", "MCP server freshness", "ok", `${processes.length} server(s), all started after the current install`)
    );
  }

  const vaultPath = ctx.config.vaultPath;
  const vaultExists = existsSync(vaultPath);
  if (!vaultExists) {
    checks.push(check("vault", "Vault", "fail", `${vaultPath} not found`, "run `superskill-cli onboard` or set VAULT_PATH"));
  } else {
    const insideGit = await git(vaultPath, ["rev-parse", "--is-inside-work-tree"]);
    if (insideGit.code === 0 && insideGit.stdout.trim() === "true") {
      checks.push(
        check("vault", "Vault", "fail", `${vaultPath} is inside a git work tree`, "project knowledge must never be committed or shared; move the vault outside any repo")
      );
    } else {
      let projectCount = 0;
      try {
        projectCount = (await readdir(join(vaultPath, "projects"), { withFileTypes: true })).filter((entry) => entry.isDirectory()).length;
      } catch {
        projectCount = 0;
      }
      checks.push(check("vault", "Vault", "ok", `${vaultPath} (${projectCount} project(s), not a git work tree)`));
    }
  }

  if (!vaultExists) {
    checks.push(check("project-map", "Project mapping", "skip", "no vault"));
  } else {
    const mapPath = join(vaultPath, "project-map.json");
    if (!existsSync(mapPath)) {
      checks.push(
        check("project-map", "Project mapping", "warn", "project-map.json does not exist", "run `superskill-cli register` (or `skill init`), or pass -p <slug>")
      );
    } else {
      const slug = await detectProject(process.cwd(), vaultPath);
      checks.push(
        slug !== null
          ? check("project-map", "Project mapping", "ok", `${process.cwd()} -> ${slug}`)
          : check("project-map", "Project mapping", "warn", `no mapping for ${process.cwd()}`, "run `superskill-cli register` (or `skill init`)")
      );
    }
  }

  const projectDir = (await getGitRoot(process.cwd())) ?? process.cwd();
  const graphPath = join(projectDir, ".superskill", "graph.json");
  if (!existsSync(graphPath)) {
    checks.push(check("graph", "Project graph", "warn", `no .superskill/graph.json in ${projectDir}`, "run `superskill-cli skill init` in this repo"));
  } else {
    let detail = graphPath;
    try {
      const parsed = JSON.parse(await readFile(graphPath, "utf-8")) as {
        nodes?: Array<{ type?: string; stack?: string[]; tools?: string[] }>;
      };
      const project = (parsed.nodes ?? []).find((node) => node.type === "project");
      if (project) {
        detail = `stack=[${(project.stack ?? []).join(", ")}] tools=[${(project.tools ?? []).join(", ")}] (repo-local, gitignored)`;
      }
    } catch {
      detail = `${graphPath} (unparseable)`;
    }
    checks.push(check("graph", "Project graph", "ok", detail));
  }

  const ignored = await git(projectDir, ["check-ignore", "-q", ".superskill"]);
  const tracked = await git(projectDir, ["ls-files", ".superskill"]);
  const trackedFiles = tracked.stdout.trim();
  const isGitRepo = existsSync(join(projectDir, ".git"));
  if (trackedFiles !== "") {
    checks.push(
      check(
        "graph-sharing",
        "Graph isolation",
        "fail",
        `.superskill/ has tracked files (${trackedFiles.split("\n").length})`,
        "the project graph must never be shared: run `git rm --cached -r .superskill` and keep `.superskill/` in .gitignore"
      )
    );
  } else if (ignored.code === 0) {
    checks.push(check("graph-sharing", "Graph isolation", "ok", ".superskill/ is gitignored (project-local, never shared)"));
  } else if (isGitRepo) {
    checks.push(check("graph-sharing", "Graph isolation", "warn", ".superskill/ is not gitignored", "run `skill init` or add `.superskill/` to .gitignore"));
  } else {
    checks.push(check("graph-sharing", "Graph isolation", "skip", "not a git repository"));
  }

  if (options.skipCatalog === true) {
    checks.push(check("catalog", "Rules catalog", "skip", "skipped"));
  } else {
    try {
      const report = await validateAll(rulesCatalogRoot(), { compile: false });
      checks.push(
        report.errors.length > 0
          ? check(
              "catalog",
              "Rules catalog",
              "fail",
              `${report.ruleCount} rules, ${report.errors.length} error(s), ${report.warnings.length} warning(s)`,
              `run: node ${join(root, "dist/rules/cli.js")} validate`
            )
          : check("catalog", "Rules catalog", "ok", `${report.ruleCount} rules, 0 errors, ${report.warnings.length} warning(s)`)
      );
    } catch (e) {
      checks.push(check("catalog", "Rules catalog", "warn", `validation failed: ${(e as Error).message}`));
    }
  }

  if (options.skipToolchains === true) {
    checks.push(check("toolchains", "Compile toolchains", "skip", "skipped"));
  } else {
    const probes = await Promise.all(
      TOOLCHAIN_PROBES.map(async (probe) => ({ ...probe, available: (await probeTool(probe.cmd, probe.cmd, probe.args)).available }))
    );
    const byLang = new Map<string, boolean>();
    for (const probe of probes) {
      byLang.set(probe.lang, (byLang.get(probe.lang) ?? true) && probe.available);
    }
    const missing = [...byLang.entries()].filter(([, ready]) => !ready).map(([lang]) => lang).sort();
    checks.push(
      missing.length === 0
        ? check("toolchains", "Compile toolchains", "ok", `${byLang.size}/${byLang.size} languages ready for compile verification`)
        : check("toolchains", "Compile toolchains", "warn", `missing: ${missing.join(", ")}`, "install these toolchains to make `validate --strict` compile checks meaningful")
    );
  }

  const telemetryEnabled = await isTelemetryEnabled();
  const { events } = await readTelemetryEvents(telemetryPaths().events);
  checks.push(
    check(
      "telemetry",
      "Telemetry",
      "ok",
      telemetryEnabled ? `enabled, ${events.length} local event(s)` : "disabled (opt-in)"
    )
  );

  const clients = detectClients();
  if (clients.length === 0) {
    checks.push(check("clients", "MCP clients", "skip", "no AI clients detected"));
  } else {
    const configured = clients.filter(clientHasSuperskillEntry);
    checks.push(
      configured.length > 0
        ? check("clients", "MCP clients", "ok", `${configured.length}/${clients.length} detected client(s) have a superskill MCP entry`)
        : check("clients", "MCP clients", "warn", `0/${clients.length} detected client(s) configured`, "run `superskill-cli setup --dry-run` then `setup`")
    );
  }

  checks.push(...(await worktreeDoctorChecks(process.cwd())));

  const summary = summarizeChecks(checks);
  return { version, healthy: summary.fail === 0, summary, checks };
}

export function renderDoctor(result: DoctorResult): string {
  const lines: string[] = [`superskill doctor — ${result.version}`, ""];
  for (const entry of result.checks) {
    const mark = entry.status === "ok" ? "ok  " : entry.status === "warn" ? "warn" : entry.status === "fail" ? "FAIL" : "skip";
    lines.push(`  [${mark}] ${entry.label.padEnd(22)} ${entry.detail}`);
    if (entry.hint !== undefined) lines.push(`           ↳ ${entry.hint}`);
  }
  lines.push("");
  lines.push(
    `Summary: ${result.summary.ok} ok, ${result.summary.warn} warn, ${result.summary.fail} fail, ${result.summary.skip} skip` +
      (result.healthy ? "" : " — fix the FAIL entries")
  );
  return lines.join("\n");
}
