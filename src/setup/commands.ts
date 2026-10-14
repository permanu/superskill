// SPDX-License-Identifier: Apache-2.0
import { existsSync, unlinkSync } from "fs";
import { assertSafeSetupPath, readSetupText, writeSetupText } from "./file-safety.js";
import { homedir } from "os";
import { join } from "path";
import type { ClientConfig } from "./types.js";
import { currentPlatform } from "./types.js";

export interface SlashCommandSpec {
  name: string;
  description: string;
  prompt: string;
}

export const SLASH_COMMAND_MARKER = "<!-- superskill:command -->";
export const SLASH_COMMAND_NAMES = ["review", "worktree", "watchdog", "superskill"] as const;

export function slashCommandSpecs(token: string): SlashCommandSpec[] {
  return [
    {
      name: "review",
      description: "superskill 18-axis review (project or diff)",
      prompt: [
        `Run a superskill review. Scope: ${token} (empty = the entire project).`,
        "",
        '1. Call the superskill MCP tool with skill_id "review/architect".',
        "2. Follow its protocol: project_context (full), resume, search (ADRs + learnings), then read every caller of each changed symbol.",
        '3. Walk all 18 axes against the scope; no axis may be skipped — write "n/a: reason" when inapplicable.',
        "",
        "Output one line per finding: path:line: axis: severity: problem. fix.",
      ].join("\n"),
    },
    {
      name: "worktree",
      description: "superskill worktree cache shortcuts (status/audit/gc)",
      prompt: [
        `Use the superskill worktree MCP tools. Input: ${token} (empty = status).`,
        "",
        "- status → `worktree_status`",
        "- audit / duplicates / leaks → `worktree_audit` (read-only)",
        "- gc / free space → `worktree_gc` dry-run first; pass confirm=true only after I approve.",
        "",
        "Never deletes worktrees, branches, or user files; reclaims are quarantined and reversible.",
      ].join("\n"),
    },
    {
      name: "watchdog",
      description: "superskill watchdog — dig for agent-environment issues, fix what I approve",
      prompt: [
        `Run a project-scoped superskill watchdog request. Input: ${token} (empty = dig the latest session).`,
        "",
        "Use the exact host-discovered MCP tool name. OpenCode Code Mode uses `tools.superskill.watchdog`; Claude Code exposes `mcp__superskill__watchdog`. Other hosts may differ; never guess or rewrite a prefix.",
        "1. For diagnosis, call the tool with action \"dig\", the scope implied by the input (session | window | env | all; default session), and persist=false. Keep it scoped to the current project; set all_projects=true and confirm=true only when the user explicitly requests and confirms cross-project scope. Include prompts only when explicitly authorized.",
        "2. For a requested fix, call the tool with action \"fix\" and apply=false. Show the planned actions; use only its reversible quarantine for file reclamation, never direct deletion. Use apply=true only after explicit confirmation. Set dismiss=true only when the user explicitly asks to dismiss.",
        "3. A generic QA request does not authorize vault, graph, or report writes or fixes. If the MCP tool is unavailable, report that or verify the installed CLI with `superskill watchdog --help`; read-only fallback: `superskill watchdog dig --scope session --no-persist`. Preview with `superskill watchdog fix --finding <id>`; add `--apply` only after explicit confirmation. Use `--dismiss` only when explicitly requested. Do not install or use npx without network approval.",
      ].join("\n"),
    },
    {
      name: "superskill",
      description: "route a task through superskill packs",
      prompt: [
        `Use the exact host-discovered superskill MCP tool name to route this task: ${token}. OpenCode Code Mode uses tools.superskill.superskill; Claude Code exposes mcp__superskill__superskill. Never guess or rewrite a prefix.`,
        "",
        "Apply the returned system brief, skills, and rules plan. For review/audit tasks also follow the review protocol it returns.",
      ].join("\n"),
    },
  ];
}

function formatForClient(slug: string): "markdown" | "toml" {
  return slug === "gemini" ? "toml" : "markdown";
}

function tokenForClient(slug: string): string {
  return slug === "gemini" ? "{{args}}" : "$ARGUMENTS";
}

function fileForCommand(dir: string, name: string, format: "markdown" | "toml"): string {
  return join(dir, `${name}.${format === "toml" ? "toml" : "md"}`);
}

export function renderSlashCommand(
  spec: SlashCommandSpec,
  format: "markdown" | "toml",
  token: string
): string {
  const body = spec.prompt.split(token).join(token);
  if (format === "toml") {
    const description = spec.description.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `# superskill:command\ndescription = "${description}"\nprompt = """\n${body}\n"""\n`;
  }
  return `---\ndescription: ${spec.description}\n---\n${SLASH_COMMAND_MARKER}\n${body}\n`;
}

export function commandDir(config: ClientConfig, homeDir?: string): string | null {
  const rel = config.commandPaths?.[currentPlatform()];
  if (!rel) return null;
  if (rel.startsWith("~")) return join(homeDir ?? homedir(), rel.slice(1));
  return rel;
}

export function installSlashCommands(
  config: ClientConfig,
  opts: { dryRun?: boolean; homeDir?: string } = {}
): { installed: string[]; skipped: string[]; dir: string | null } {
  const dir = commandDir(config, opts.homeDir);
  const result: { installed: string[]; skipped: string[]; dir: string | null } = {
    installed: [],
    skipped: [],
    dir,
  };
  if (!dir) return result;

  const format = formatForClient(config.slug);
  const token = tokenForClient(config.slug);
  for (const spec of slashCommandSpecs(token)) {
    const file = fileForCommand(dir, spec.name, format);
    const content = renderSlashCommand(spec, format, token);
    try {
      assertSafeSetupPath(file);
    } catch (error) {
      console.error(`[setup-commands] ${(error as Error).message}`);
      result.skipped.push(spec.name);
      continue;
    }
    if (existsSync(file)) {
      let existing = "";
      try {
        existing = readSetupText(file) ?? "";
      } catch (error) {
        console.error(`[setup-commands] Could not read ${file}: ${(error as Error).message}`);
        existing = "";
      }
      if (!existing.includes("superskill:command")) {
        result.skipped.push(spec.name);
        continue;
      }
      if (!opts.dryRun && existing !== content) writeSetupText(file, content, existing);
    } else if (!opts.dryRun) {
      writeSetupText(file, content, null);
    }
    result.installed.push(spec.name);
  }
  return result;
}

export function removeSlashCommands(
  config: ClientConfig,
  opts: { homeDir?: string } = {}
): { removed: string[] } {
  const removed: string[] = [];
  const dir = commandDir(config, opts.homeDir);
  if (!dir) return { removed };

  const format = formatForClient(config.slug);
  const token = tokenForClient(config.slug);
  for (const spec of slashCommandSpecs(token)) {
    const file = fileForCommand(dir, spec.name, format);
    if (!existsSync(file)) continue;
    try {
      assertSafeSetupPath(file);
      const content = readSetupText(file);
      if (content === renderSlashCommand(spec, format, token)) {
        assertSafeSetupPath(file);
        unlinkSync(file);
        removed.push(spec.name);
      }
    } catch (error) {
      console.error(`[setup-commands] Could not remove ${file}: ${(error as Error).message}`);
      continue;
    }
  }
  return { removed };
}
