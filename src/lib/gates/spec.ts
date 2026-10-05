// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import type { VaultFS } from "../vault-fs.js";
import { parseFrontmatter, type Frontmatter } from "../frontmatter.js";

export interface SpecAcceptance {
  id: string;
  text: string;
  command?: string;
  manual?: string;
}

export interface SpecFiles {
  allowed: string[];
  forbidden: string[];
}

export interface Spec {
  goal: string;
  non_goals: string[];
  constraints: string[];
  context: string;
  files: SpecFiles;
  acceptance: SpecAcceptance[];
  risks: string[];
  rollback: string;
}

export interface SpecGap {
  field: string;
  reason: string;
}

export type SpecStatus = "draft" | "approved" | "frozen";

export const SPEC_STATUSES: SpecStatus[] = ["draft", "approved", "frozen"];

export const SPEC_SECTIONS = [
  "Goal",
  "Non-Goals",
  "Constraints",
  "Context",
  "Files",
  "Acceptance",
  "Risks",
  "Rollback",
] as const;

export type AcceptanceInput = string | { id?: string; text: string; command?: string; manual?: string };

export function emptySpec(): Spec {
  return {
    goal: "",
    non_goals: [],
    constraints: [],
    context: "",
    files: { allowed: [], forbidden: [] },
    acceptance: [],
    risks: [],
    rollback: "",
  };
}

/**
 * Normalize loose acceptance input (strings or partial objects) into SpecAcceptance[].
 * Ids are auto-assigned as A1..An when absent.
 */
export function normalizeAcceptance(items: AcceptanceInput[]): SpecAcceptance[] {
  return items.map((item, index) => {
    const raw = typeof item === "string" ? { text: item } : item;
    const acceptance: SpecAcceptance = {
      id: raw.id?.trim() || `A${index + 1}`,
      text: (raw.text ?? "").trim(),
    };
    if (raw.command?.trim()) acceptance.command = raw.command.trim();
    if (raw.manual?.trim()) acceptance.manual = raw.manual.trim();
    return acceptance;
  });
}

/**
 * Parse a CLI-style acceptance string: "text | run: <cmd>" or "text | manual: <reason>".
 * Plain text is returned unchanged.
 */
export function parseAcceptanceItem(raw: string): AcceptanceInput {
  const match = raw.match(/^(.*?)\s*\|\s*(run|manual):\s*(.*)$/);
  if (!match) return raw.trim();
  const text = match[1].trim();
  const value = match[3].trim();
  return match[2] === "run" ? { text, command: value } : { text, manual: value };
}

function extractSection(body: string, name: string): string {
  const header = new RegExp(`^##\\s+${name}\\s*$`, "m");
  const match = header.exec(body);
  if (!match) return "";
  const rest = body.slice(match.index + match[0].length);
  const next = rest.search(/^##\s+/m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function extractSubsection(section: string, name: string): string {
  const header = new RegExp(`^###\\s+${name}\\s*$`, "m");
  const match = header.exec(section);
  if (!match) return "";
  const rest = section.slice(match.index + match[0].length);
  const next = rest.search(/^###\s+/m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function extractBullets(text: string): string[] {
  const items: string[] = [];
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (!match) continue;
    const value = match[1].replace(/^`(.*)`$/, "$1").trim();
    if (value) items.push(value);
  }
  return items;
}

function parseAcceptanceLines(text: string): SpecAcceptance[] {
  const items: SpecAcceptance[] = [];
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*[-*]\s*\[[ xX]\]\s*([A-Za-z0-9_-]+)\s*:\s*(.*?)\s*$/);
    if (!match) continue;
    const id = match[1];
    const rest = match[2];
    const marker = rest.match(/^(.*?)\s*\|\s*(run|manual):\s*(.*)$/);
    if (marker) {
      const item: SpecAcceptance = { id, text: marker[1].trim() };
      if (marker[2] === "run") item.command = marker[3].trim();
      else item.manual = marker[3].trim();
      items.push(item);
    } else {
      items.push({ id, text: rest.trim() });
    }
  }
  return items;
}

export function parseSpec(body: string): Spec {
  const spec = emptySpec();
  spec.goal = extractSection(body, "Goal");
  spec.non_goals = extractBullets(extractSection(body, "Non-Goals"));
  spec.constraints = extractBullets(extractSection(body, "Constraints"));
  spec.context = extractSection(body, "Context");
  const files = extractSection(body, "Files");
  spec.files = {
    allowed: extractBullets(extractSubsection(files, "Allowed")),
    forbidden: extractBullets(extractSubsection(files, "Forbidden")),
  };
  spec.acceptance = parseAcceptanceLines(extractSection(body, "Acceptance"));
  spec.risks = extractBullets(extractSection(body, "Risks"));
  spec.rollback = extractSection(body, "Rollback");
  return spec;
}

function bulletLines(items: string[]): string[] {
  return items.map((item) => `- ${item}`);
}

function renderAcceptance(item: SpecAcceptance): string {
  let line = `- [ ] ${item.id}: ${item.text.trim()}`;
  if (item.command?.trim()) line += ` | run: ${item.command.trim()}`;
  if (item.manual?.trim()) line += ` | manual: ${item.manual.trim()}`;
  return line;
}

/**
 * Render a spec as markdown with fixed headers. Parse(render(spec)) is stable.
 */
export function renderSpec(spec: Spec, title?: string): string {
  const lines: string[] = [];
  if (title?.trim()) lines.push(`# ${title.trim()}`, "");
  const section = (name: string, content: string[]) => {
    lines.push(`## ${name}`, "", ...content, "");
  };

  section("Goal", [spec.goal.trim()]);
  section("Non-Goals", bulletLines(spec.non_goals));
  section("Constraints", bulletLines(spec.constraints));
  section("Context", [spec.context.trim()]);
  section("Files", [
    "### Allowed",
    "",
    ...bulletLines(spec.files.allowed.map((pattern) => `\`${pattern}\``)),
    "",
    "### Forbidden",
    "",
    ...bulletLines(spec.files.forbidden.map((pattern) => `\`${pattern}\``)),
  ]);
  section("Acceptance", spec.acceptance.map(renderAcceptance));
  section("Risks", bulletLines(spec.risks));
  section("Rollback", [spec.rollback.trim()]);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/**
 * Structural validation: a spec that fails this cannot be gated.
 */
export function validateSpec(spec: Spec): string[] {
  const errors = validateAcceptance(spec.acceptance);
  for (const pattern of [...spec.files.allowed, ...spec.files.forbidden]) {
    if (!pattern.trim()) errors.push("File pattern must not be empty");
  }
  return errors;
}

export function validateAcceptance(acceptance: SpecAcceptance[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const item of acceptance) {
    const id = item.id.trim();
    if (!id) errors.push("Acceptance item missing id");
    else if (seen.has(id)) errors.push(`Duplicate acceptance id: ${id}`);
    seen.add(id);
    if (!item.text.trim()) errors.push(`Acceptance ${id || "?"} missing description`);
    if (/\|\s*(run|manual):/.test(item.text)) {
      errors.push(`Acceptance ${id}: text must not contain "| run:" or "| manual:"`);
    }
    const hasCommand = Boolean(item.command?.trim());
    const hasManual = Boolean(item.manual?.trim());
    if (!hasCommand && !hasManual) {
      errors.push(`Acceptance ${id}: needs an executable command or a "manual: <reason>" annotation`);
    }
    if (item.command !== undefined && !item.command.trim()) {
      errors.push(`Acceptance ${id}: command must not be empty`);
    }
    if (item.manual !== undefined && !item.manual.trim()) {
      errors.push(`Acceptance ${id}: manual reason must not be empty`);
    }
    for (const value of [item.text, item.command ?? "", item.manual ?? ""]) {
      if (value.includes("\n")) errors.push(`Acceptance ${id}: values must be single-line`);
    }
  }
  return errors;
}

/**
 * Grill report: missing or weak fields a human must fill before approval.
 */
export function specGaps(spec: Spec): SpecGap[] {
  const gaps: SpecGap[] = [];
  const missing = (field: string, isEmpty: boolean) => {
    if (isEmpty) gaps.push({ field, reason: "missing" });
  };

  missing("goal", spec.goal.trim().length === 0);
  missing("non_goals", spec.non_goals.length === 0);
  missing("constraints", spec.constraints.length === 0);
  missing("context", spec.context.trim().length === 0);
  missing("files.allowed", spec.files.allowed.length === 0);
  missing("files.forbidden", spec.files.forbidden.length === 0);
  missing("acceptance", spec.acceptance.length === 0);
  for (const item of spec.acceptance) {
    const hasCommand = Boolean(item.command?.trim());
    const hasManual = Boolean(item.manual?.trim());
    if (!hasCommand && !hasManual) {
      gaps.push({ field: `acceptance.${item.id || "?"}`, reason: "no executable command or manual reason" });
    }
  }
  missing("risks", spec.risks.length === 0);
  missing("rollback", spec.rollback.trim().length === 0);

  return gaps;
}

function normalizeSpec(spec: Spec): Spec {
  return {
    goal: spec.goal.trim(),
    non_goals: spec.non_goals.map((item) => item.trim()).filter(Boolean),
    constraints: spec.constraints.map((item) => item.trim()).filter(Boolean),
    context: spec.context.trim(),
    files: {
      allowed: spec.files.allowed.map((item) => item.trim()).filter(Boolean),
      forbidden: spec.files.forbidden.map((item) => item.trim()).filter(Boolean),
    },
    acceptance: spec.acceptance.map((item) => {
      const normalized: SpecAcceptance = { id: item.id.trim(), text: item.text.trim() };
      if (item.command?.trim()) normalized.command = item.command.trim();
      if (item.manual?.trim()) normalized.manual = item.manual.trim();
      return normalized;
    }),
    risks: spec.risks.map((item) => item.trim()).filter(Boolean),
    rollback: spec.rollback.trim(),
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Deterministic content hash over the normalized spec. Decisions never depend on time.
 */
export function hashSpec(spec: Spec): string {
  return createHash("sha256").update(stableStringify(normalizeSpec(spec))).digest("hex");
}

export interface LoadedSpec {
  path: string;
  frontmatter: Frontmatter;
  body: string;
  spec: Spec;
  hash: string;
  storedHash: string | null;
  hashMatches: boolean;
  status: SpecStatus;
  specId: string | null;
  title: string | null;
}

export async function listSpecFiles(vaultFs: VaultFS, specsDir: string): Promise<string[]> {
  try {
    const entries = await vaultFs.list(specsDir, 1);
    return entries.filter((file) => file.endsWith(".md")).sort();
  } catch {
    return [];
  }
}

/**
 * Resolve a spec reference: full path, "NNN", "NNN-slug", or exact filename.
 */
export async function resolveSpecPath(vaultFs: VaultFS, specsDir: string, ref: string): Promise<string> {
  const clean = ref.replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (clean.endsWith(".md") && (await vaultFs.exists(clean))) return clean;

  const refName = clean.split("/").pop() ?? clean;
  const numeric = /^\d+$/.test(refName) ? refName.padStart(3, "0") : null;
  const files = await listSpecFiles(vaultFs, specsDir);
  const match = files.find((file) => {
    const base = file.split("/").pop() ?? file;
    return (
      base === refName ||
      base === `${refName}.md` ||
      base.startsWith(`${refName}-`) ||
      (numeric !== null && base.startsWith(`${numeric}-`))
    );
  });
  if (!match) throw new Error(`Spec not found: ${ref}`);
  return match;
}

export async function loadSpec(vaultFs: VaultFS, path: string): Promise<LoadedSpec> {
  const content = await vaultFs.read(path);
  const { data, content: body } = parseFrontmatter(content);
  const spec = parseSpec(body);
  const hash = hashSpec(spec);
  const storedHash = typeof data.hash === "string" && data.hash.length > 0 ? data.hash : null;
  const status = SPEC_STATUSES.includes(data.status as SpecStatus)
    ? (data.status as SpecStatus)
    : "draft";
  const basename = path.split("/").pop() ?? path;
  const idMatch = basename.match(/^(\d+)/);
  const titleMatch = body.match(/^#\s+(.+)$/m);
  return {
    path,
    frontmatter: data,
    body,
    spec,
    hash,
    storedHash,
    hashMatches: storedHash === hash,
    status,
    specId: typeof data.spec_id === "string" ? data.spec_id : idMatch ? idMatch[1] : null,
    title: typeof data.title === "string" ? data.title : titleMatch ? titleMatch[1].trim() : null,
  };
}
