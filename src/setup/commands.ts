// SPDX-License-Identifier: Apache-2.0
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
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
        `Run a superskill watchdog pass. Input: ${token} (empty = dig the latest session).`,
        "",
        "1. Call the superskill MCP tool `watchdog` with action \"dig\" and the scope implied by the input (session | window --since 7d | env | all). Default: session.",
        "2. Read catalog/watchdog/dig.md and follow it: verify every finding against this repo before proposing anything; present findings most-severe-first with evidence and a concrete proposal.",
        "3. For steering/guardrail findings, make the edits yourself (navigation pointers; deterministic checks over prose rules). For mechanical reclamation, call `watchdog fix` — dry-run first, `--apply` only after I confirm.",
        "4. Close the loop: mark what changed with `watchdog fix --finding <id> --apply` (or --dismiss).",
      ].join("\n"),
    },
    {
      name: "superskill",
      description: "route a task through superskill packs",
      prompt: [
        `Call the superskill MCP tool with task: ${token}`,
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
    if (existsSync(file)) {
      let existing = "";
      try {
        existing = readFileSync(file, "utf-8");
      } catch {
        existing = "";
      }
      if (!existing.includes("superskill:command")) {
        result.skipped.push(spec.name);
        continue;
      }
      if (!opts.dryRun && existing !== content) writeFileSync(file, content, "utf-8");
    } else if (!opts.dryRun) {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(file, content, "utf-8");
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
      const content = readFileSync(file, "utf-8");
      if (content.includes("superskill:command")) {
        unlinkSync(file);
        removed.push(spec.name);
      }
    } catch {
      continue;
    }
  }
  return { removed };
}
