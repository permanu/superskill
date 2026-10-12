// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CommandContext } from "../../core/types.js";
import { loadGraph } from "../../lib/graph/store.js";
import { findNodes, findNode } from "../../lib/graph/store.js";
import { listInstalledSkills } from "../../lib/skill-installer.js";
import type { SkillNode, ProjectNode, SessionNode } from "../../lib/graph/schema.js";

export const UNAUDITED_MARKER = ".unaudited-superskill";

export interface InstalledSkillProvenance {
  name: string;
  source: string;
  audit_summary: string;
  unaudited: boolean;
}

export interface StatusResult {
  initialized: boolean;
  message?: string;
  project: { stack: string[]; tools: string[]; phase: string } | null;
  skills: Array<{
    id: string;
    source: string;
    w: number;
    audit_summary: string;
  }>;
  sessions: Array<{
    id: string;
    intent: string;
    skills: string[];
    outcome: string | null;
    ts: number;
  }>;
  total_activations: number;
  graph_path: string;
  unaudited_count: number;
  unaudited_skills: string[];
  installed_skills: InstalledSkillProvenance[];
  warnings: string[];
}

interface AuditLike {
  gen: string;
  socket: string;
  snyk: string;
}

function asAudits(value: unknown): AuditLike | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const pick = (v: unknown): string => (typeof v === "string" ? v : "unknown");
  return { gen: pick(record.gen), socket: pick(record.socket), snyk: pick(record.snyk) };
}

function auditSummary(audits: AuditLike): string {
  const vals = [audits.gen, audits.socket, audits.snyk];
  if (vals.some((v) => v === "fail")) return "blocked";
  if (vals.some((v) => v === "warn")) return "warn";
  if (vals.every((v) => v === "pass")) return "pass";
  return "unknown";
}

async function readMarker(dir: string): Promise<Record<string, unknown> | null> {
  let raw: string;
  try {
    raw = await readFile(join(dir, UNAUDITED_MARKER), "utf-8");
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[skill-status] failed to read ${UNAUDITED_MARKER} in ${dir}: ${(err as Error).message}`);
    }
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    console.error(`[skill-status] unparseable ${UNAUDITED_MARKER} in ${dir}; treating the skill as unaudited`);
    return {};
  }
}

/**
 * Per-skill audit provenance for every installed skill, including skills that
 * were installed without complete audits (marker present).
 */
export async function listInstalledSkillProvenance(): Promise<InstalledSkillProvenance[]> {
  const installed: InstalledSkillProvenance[] = [];
  for (const skill of await listInstalledSkills()) {
    const marker = await readMarker(skill.dir);
    const audits = skill.audits ?? asAudits(marker?.audits);
    installed.push({
      name: skill.name,
      source: (marker && typeof marker.source === "string" ? marker.source : skill.source) ?? "unknown",
      audit_summary: audits ? auditSummary(audits) : "unknown",
      unaudited: marker !== null,
    });
  }
  return installed.sort((a, b) => a.name.localeCompare(b.name));
}

export async function findUnauditedInstalledSkills(): Promise<string[]> {
  return (await listInstalledSkillProvenance()).filter((skill) => skill.unaudited).map((skill) => skill.name);
}

export async function statusCommand(
  _args: Record<string, unknown>,
  ctx: CommandContext,
): Promise<StatusResult> {
  const projectDir = process.cwd();
  const graph = await loadGraph(projectDir);
  const installedSkills = await listInstalledSkillProvenance();
  const unauditedSkills = installedSkills.filter((skill) => skill.unaudited).map((skill) => skill.name);
  const warnings = unauditedSkills.length > 0
    ? [`WARN: ${unauditedSkills.length} installed skill(s) were installed without a skills.sh audit: ${unauditedSkills.join(", ")}. Audit before use.`]
    : [];

  if (graph.nodes.length === 0) {
    return {
      initialized: false,
      message: "No knowledge graph found. Run `superskill skill init` first to initialize this project.",
      project: null,
      skills: [],
      sessions: [],
      total_activations: 0,
      graph_path: join(projectDir, ".superskill", "graph.json"),
      unaudited_count: unauditedSkills.length,
      unaudited_skills: unauditedSkills,
      installed_skills: installedSkills,
      warnings,
    };
  }

  const project = findNode<ProjectNode>(graph, "project", "project");
  const skills = findNodes<SkillNode>(graph, "skill")
    .sort((a, b) => b.w - a.w)
    .map((s) => ({
      id: s.id,
      source: s.source,
      w: Math.round(s.w * 1000) / 1000,
      audit_summary: auditSummary(s.audits),
    }));

  const sessions = findNodes<SessionNode>(graph, "session")
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 10)
    .map((s) => ({
      id: s.id,
      intent: s.intent,
      skills: s.skills,
      outcome: s.outcome,
      ts: s.ts,
    }));

  const totalActivations = graph.edges
    .filter((e) => e.type === "project_skill")
    .reduce((sum, e) => sum + (e as { activations: number }).activations, 0);

  return {
    initialized: true,
    project: project
      ? { stack: project.stack, tools: project.tools, phase: project.phase }
      : null,
    skills,
    sessions,
    total_activations: totalActivations,
    graph_path: join(projectDir, ".superskill", "graph.json"),
    unaudited_count: unauditedSkills.length,
    unaudited_skills: unauditedSkills,
    installed_skills: installedSkills,
    warnings,
  };
}
