// SPDX-License-Identifier: Apache-2.0

export type NodeType = "project" | "skill" | "session";
export type EdgeType = "project_skill" | "skill_skill" | "session_skill" | "session_file";

export const GRAPH_SCHEMA_VERSION = 3;

export type AuditStatus = "pass" | "fail" | "warn" | "unknown";

export interface AuditResult {
  gen: AuditStatus;
  socket: AuditStatus;
  snyk: AuditStatus;
}

export type SkillSource = "native" | "routed" | "catalog";
export type SkillPack = "memory" | "code" | "review" | "security" | "ops" | "devops" | "optimizer" | "pipeline" | "watchdog" | "ui";
export type ProjectPhase = "explore" | "implement" | "review" | "ship";
export type SessionOutcome = "success" | "partial" | "abandoned";

export interface ProjectNode {
  type: "project";
  id: "project";
  stack: string[];
  tools: string[];
  phase: ProjectPhase;
  ts: number;
}

export interface SkillNode {
  type: "skill";
  id: string;
  source: SkillSource;
  audits: AuditResult;
  installs: number;
  stars: number;
  w: number;
  ts: number;
  /** Epoch ms of the most recent activation; absent when never activated. */
  lastUsed?: number;
  pack?: SkillPack;
  langs?: string[];
  triggers?: string[];
  always?: boolean;
  path?: string;
}

export interface SessionNode {
  type: "session";
  id: string;
  coordinationSessionId?: string;
  intent: string;
  skills: string[];
  files: string[];
  outcome: SessionOutcome | null;
  insights: string[];
  ts: number;
}

export type Node = ProjectNode | SkillNode | SessionNode;

export interface ProjectSkillEdge {
  type: "project_skill";
  from: string;
  to: string;
  w: number;
  activations: number;
}

export interface SkillSkillEdge {
  type: "skill_skill";
  from: string;
  to: string;
  w: number;
  co_activations: number;
}

export interface SessionSkillEdge {
  type: "session_skill";
  from: string;
  to: string;
  role: "primary" | "secondary";
}

export interface SessionFileEdge {
  type: "session_file";
  from: string;
  to: string;
  action: "modified" | "created" | "read";
}

export type Edge = ProjectSkillEdge | SkillSkillEdge | SessionSkillEdge | SessionFileEdge;

export interface Graph {
  version?: number;
  catalogVersion?: string;
  nodes: Node[];
  edges: Edge[];
}

export class GraphCorruptionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(`Invalid graph: ${message}`, options);
    this.name = "GraphCorruptionError";
  }
}

export class UnsupportedGraphVersionError extends Error {
  constructor(version: number) {
    super(`Unsupported graph schema version: ${version}; supported versions are 1-${GRAPH_SCHEMA_VERSION}`);
    this.name = "UnsupportedGraphVersionError";
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

function nonnegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function count(value: unknown): value is number {
  return nonnegative(value) && Number.isSafeInteger(value);
}

function weight(value: unknown): value is number {
  return nonnegative(value) && value <= 1;
}

function oneOf(value: unknown, values: readonly string[]): boolean {
  return typeof value === "string" && values.includes(value);
}

function validNode(node: unknown): node is Node {
  if (!record(node) || typeof node.id !== "string" || node.id.length === 0 || !nonnegative(node.ts)) return false;
  switch (node.type) {
    case "project":
      return node.id === "project" && strings(node.stack) && strings(node.tools) &&
        oneOf(node.phase, ["explore", "implement", "review", "ship"]);
    case "skill":
      return oneOf(node.source, ["native", "routed", "catalog"]) && record(node.audits) &&
        [node.audits.gen, node.audits.socket, node.audits.snyk].every(status => oneOf(status, ["pass", "fail", "warn", "unknown"])) &&
        count(node.installs) && count(node.stars) && weight(node.w) &&
        (node.lastUsed === undefined || nonnegative(node.lastUsed)) &&
        (node.pack === undefined || oneOf(node.pack, ["memory", "code", "review", "security", "ops", "devops", "optimizer", "pipeline", "watchdog", "ui"])) &&
        (node.langs === undefined || strings(node.langs)) && (node.triggers === undefined || strings(node.triggers)) &&
        (node.always === undefined || typeof node.always === "boolean") && (node.path === undefined || typeof node.path === "string");
    case "session":
      return typeof node.intent === "string" && strings(node.skills) && strings(node.files) && strings(node.insights) &&
        (node.outcome === null || oneOf(node.outcome, ["success", "partial", "abandoned"])) &&
        (node.coordinationSessionId === undefined || typeof node.coordinationSessionId === "string");
    default:
      return false;
  }
}

export function normalizeEdge(edge: Edge): Edge {
  return edge.type === "skill_skill" && edge.from > edge.to
    ? { ...edge, from: edge.to, to: edge.from }
    : edge;
}

export function edgeIdentity(edge: Edge): string {
  const normalized = normalizeEdge(edge);
  return JSON.stringify([normalized.type, normalized.from, normalized.to]);
}

function validEdge(edge: unknown, nodes: Set<string>): edge is Edge {
  if (!record(edge) || typeof edge.from !== "string" || !edge.from || typeof edge.to !== "string" || !edge.to) return false;
  const has = (type: NodeType, id: string) => nodes.has(JSON.stringify([type, id]));
  switch (edge.type) {
    case "project_skill":
      return has("project", edge.from) && has("skill", edge.to) && weight(edge.w) && count(edge.activations);
    case "skill_skill":
      return edge.from !== edge.to && has("skill", edge.from) && has("skill", edge.to) && weight(edge.w) && count(edge.co_activations);
    case "session_skill":
      return has("session", edge.from) && has("skill", edge.to) && oneOf(edge.role, ["primary", "secondary"]);
    case "session_file":
      return has("session", edge.from) && oneOf(edge.action, ["modified", "created", "read"]);
    default:
      return false;
  }
}

export function validateGraph(value: unknown): Graph {
  if (!record(value)) throw new GraphCorruptionError("expected an object");
  const version = value.version === undefined ? 1 : value.version;
  if (typeof version !== "number" || !Number.isSafeInteger(version)) throw new GraphCorruptionError("invalid schema version");
  if (version < 1 || version > GRAPH_SCHEMA_VERSION) throw new UnsupportedGraphVersionError(version);
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) throw new GraphCorruptionError("expected nodes and edges arrays");
  if (value.catalogVersion !== undefined && typeof value.catalogVersion !== "string") throw new GraphCorruptionError("invalid catalog version");
  const nodeIds = new Set<string>();
  for (const node of value.nodes) {
    if (!validNode(node)) throw new GraphCorruptionError("invalid node fields");
    const key = JSON.stringify([node.type, node.id]);
    if (nodeIds.has(key)) throw new GraphCorruptionError(`duplicate node ${key}`);
    nodeIds.add(key);
  }
  const edges: Edge[] = [];
  const edgeIndices = new Map<string, number>();
  for (const edge of value.edges) {
    if (!validEdge(edge, nodeIds)) throw new GraphCorruptionError("invalid edge fields or endpoints");
    const normalized = normalizeEdge(edge);
    const key = edgeIdentity(normalized);
    const previous = edgeIndices.get(key);
    if (previous !== undefined) {
      const existing = edges[previous];
      if (existing.type !== "skill_skill" || normalized.type !== "skill_skill") throw new GraphCorruptionError(`duplicate edge ${key}`);
      edges[previous] = { ...existing, w: Math.max(existing.w, normalized.w), co_activations: Math.max(existing.co_activations, normalized.co_activations) };
    } else {
      edgeIndices.set(key, edges.length);
      edges.push(normalized);
    }
  }
  return { ...value, version: GRAPH_SCHEMA_VERSION, nodes: value.nodes as Node[], edges };
}

export interface IndexResult {
  project: { stack: string[]; tools: string[]; phase: ProjectPhase };
  skills: Array<{ id: string; w: number; audits: AuditResult }>;
  topCoActivations: Array<{ from: string; to: string; w: number }>;
}

export interface NeighborhoodResult {
  matchedSkills: Array<{
    id: string;
    source: SkillSource;
    audits: AuditResult;
    w: number;
    installs: number;
    stars: number;
  }>;
  coActivatedSkills: Array<{ id: string; w: number }>;
  recentSessions: Array<{
    id: string;
    intent: string;
    skills: string[];
    outcome: SessionOutcome | null;
    insights: string[];
    ts: number;
  }>;
}

export interface ContentResult {
  skills: Array<{ id: string; content: string; stale?: boolean }>;
  warnings: string[];
}
