// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from "node:crypto";
import { edgeIdentity, normalizeEdge } from "./schema.js";
import type {
  Graph,
  Edge,
  SessionNode,
  SessionOutcome,
  ProjectSkillEdge,
  SkillNode,
  SkillSkillEdge,
} from "./schema.js";
import { addNode, updateNode, findNode, findNodes, pruneSessions, decayWeights } from "./store.js";

const SESSION_WINDOW_MS = 3_600_000;
export const MAX_SESSION_FILES = 1000;
export const MAX_SESSION_SKILLS = 100;

export function boostWeight(w: number): number {
  return (Number.isFinite(w) ? Math.min(1, Math.max(0, w)) : 0) * 0.9 + 0.1;
}

export function normalizeStars(stars: number): number {
  if (!Number.isFinite(stars) || stars <= 0) return 0;
  return Math.min(1, Math.log10(stars + 1) / 6);
}

export function normalizeInstalls(installs: number): number {
  if (!Number.isFinite(installs) || installs <= 0) return 0;
  return Math.min(1, Math.log10(installs + 1) / 6);
}

export function findOrCreateSession(
  graph: Graph,
  intent: string,
  coordinationSessionId?: string,
): { graph: Graph; sessionId: string } {
  const sessions = findNodes<SessionNode>(graph, "session");
  if (coordinationSessionId) {
    const existing = sessions.find((session) => session.id === coordinationSessionId);
    if (existing) {
      if (existing.outcome !== null) throw new Error(`Graph session already completed: ${coordinationSessionId}`);
      return { graph, sessionId: existing.id };
    }
    return startSession(graph, intent, coordinationSessionId);
  }
  const now = Date.now();

  let recent: SessionNode | undefined;
  for (const session of sessions) {
    if (!session.coordinationSessionId && session.intent === intent && session.outcome === null && now >= session.ts && now - session.ts < SESSION_WINDOW_MS && (!recent || session.ts > recent.ts)) recent = session;
  }

  if (recent) return { graph, sessionId: recent.id };

  let updated = graph;
  const stale = sessions.filter((s) => !s.coordinationSessionId && s.outcome === null && now - s.ts >= SESSION_WINDOW_MS);
  if (stale.length > 0) {
    const staleIds = new Set(stale.map(session => session.id));
    updated = { ...updated, nodes: updated.nodes.map(node => node.type === "session" && staleIds.has(node.id) ? { ...node, outcome: "partial" } : node) };
    const allActivatedIds = new Set(stale.flatMap((s) => s.skills));
    updated = decayWeights(updated, allActivatedIds, 0.05, 0.1);
    updated = pruneSessions(updated, 50);
  }

  return startSession(updated, intent);
}

export function startSession(
  graph: Graph,
  intent: string,
  coordinationSessionId?: string,
): { graph: Graph; sessionId: string } {
  const ts = Date.now();
  const sessionId = coordinationSessionId ?? `s_${randomUUID()}`;
  const existing = findNode<SessionNode>(graph, "session", sessionId);
  if (existing) {
    if (existing.outcome !== null) throw new Error(`Graph session already completed: ${sessionId}`);
    return { graph, sessionId };
  }

  const session: SessionNode = {
    type: "session",
    id: sessionId,
    ...(coordinationSessionId ? { coordinationSessionId } : {}),
    intent,
    skills: [],
    files: [],
    outcome: null,
    insights: [],
    ts,
  };

  const updated = addNode(graph, session);
  return { graph: updated, sessionId };
}

export function recordActivation(
  graph: Graph,
  sessionId: string,
  skillId: string,
  files: string[],
): Graph {
  const session = findNode<SessionNode>(graph, "session", sessionId);
  if (!session || session.outcome !== null) return graph;
  const skills = new Map(findNodes<SkillNode>(graph, "skill").map(skill => [skill.id, skill]));
  const skill = skills.get(skillId);
  if (!skill) return graph;
  const priorSkills = [...new Set(session.skills)].filter(id => skills.has(id)).slice(0, MAX_SESSION_SKILLS);
  const alreadyActivated = priorSkills.includes(skillId);
  if (!alreadyActivated && priorSkills.length >= MAX_SESSION_SKILLS) return graph;
  const updatedSkills = [...new Set([...priorSkills, skillId])];
  const incomingFiles = new Set(files.slice(0, MAX_SESSION_FILES).filter(file => typeof file === "string" && file.length > 0));
  const updatedFiles = [...new Set([...session.files.slice(0, MAX_SESSION_FILES), ...incomingFiles])]
    .filter(file => typeof file === "string" && file.length > 0).slice(0, MAX_SESSION_FILES);
  const fileSet = new Set(updatedFiles);
  const skillSet = new Set(updatedSkills);
  const edges = new Map<string, Edge>();
  for (const edge of graph.edges) {
    if (edge.from === sessionId && ((edge.type === "session_skill" && !skillSet.has(edge.to)) || (edge.type === "session_file" && !fileSet.has(edge.to)))) continue;
    const normalized = normalizeEdge(edge);
    const key = edgeIdentity(normalized);
    const existing = edges.get(key);
    edges.set(key, existing?.type === "skill_skill" && normalized.type === "skill_skill"
      ? { ...normalized, w: Math.max(existing.w, normalized.w), co_activations: Math.max(existing.co_activations, normalized.co_activations) }
      : normalized);
  }
  const put = (edge: Edge) => edges.set(edgeIdentity(edge), normalizeEdge(edge));
  put({
    type: "session_skill",
    from: sessionId,
    to: skillId,
    role: updatedSkills[0] === skillId ? "primary" : "secondary",
  });

  for (const file of incomingFiles) {
    if (!fileSet.has(file)) continue;
    put({
      type: "session_file",
      from: sessionId,
      to: file,
      action: "modified",
    });
  }

  const increment = (value: number) => Math.min(Number.MAX_SAFE_INTEGER, (Number.isSafeInteger(value) && value >= 0 ? value : 0) + 1);
  if (findNode(graph, "project", "project")) {
    const base: ProjectSkillEdge = { type: "project_skill", from: "project", to: skillId, w: skill.w, activations: 0 };
    const existing = (edges.get(edgeIdentity(base)) as ProjectSkillEdge | undefined) ?? base;
    put({ ...existing, w: Math.round(boostWeight(existing.w) * 10000) / 10000, activations: increment(existing.activations) });
  }

  for (const existingSkillId of priorSkills) {
    if (existingSkillId === skillId) continue;
    if (alreadyActivated) continue;
    const base: SkillSkillEdge = { type: "skill_skill", from: existingSkillId, to: skillId, w: 0, co_activations: 0 };
    const existing = (edges.get(edgeIdentity(base)) as SkillSkillEdge | undefined) ?? base;
    put({ ...existing, w: Math.round(boostWeight(existing.w) * 10000) / 10000, co_activations: increment(existing.co_activations) });
  }

  const now = Date.now();
  return {
    ...graph,
    nodes: graph.nodes.map(node => {
      if (node.type === "session" && node.id === sessionId) return { ...node, skills: updatedSkills, files: updatedFiles };
      if (node.type === "skill" && node.id === skillId) return { ...node, lastUsed: now };
      return node;
    }),
    edges: [...edges.values()],
  };
}

export function endSession(
  graph: Graph,
  sessionId: string,
  outcome: SessionOutcome,
  insights: string[],
): Graph {
  const session = findNode<SessionNode>(graph, "session", sessionId);
  if (!session || session.outcome !== null) return graph;
  let updated = updateNode(graph, "session", sessionId, {
    outcome,
    insights: [...new Set([...session.insights, ...insights])],
  } as Partial<SessionNode>);

  const activatedIds = new Set(session.skills);
  updated = decayWeights(updated, activatedIds, 0.05, 0.1);
  updated = pruneSessions(updated, 50);

  return updated;
}
