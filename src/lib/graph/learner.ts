// SPDX-License-Identifier: AGPL-3.0-or-later

import type {
  Graph,
  SessionNode,
  SessionOutcome,
  ProjectSkillEdge,
  SkillSkillEdge,
} from "./schema.js";
import { addNode, addEdge, updateNode, findNode, findNodes, pruneSessions, decayWeights } from "./store.js";

const SESSION_WINDOW_MS = 3_600_000;

export function boostWeight(w: number): number {
  return w * 0.9 + 1.0 * 0.1;
}

export function decayWeight(w: number): number {
  return Math.max(0.1, w * 0.95);
}

export function normalizeInstalls(installs: number): number {
  if (installs <= 0) return 0;
  return Math.min(1, Math.log10(installs + 1) / 6);
}

export function findOrCreateSession(
  graph: Graph,
  intent: string,
): { graph: Graph; sessionId: string } {
  const sessions = findNodes<SessionNode>(graph, "session");
  const now = Date.now();

  const recent = sessions
    .filter((s) => s.outcome === null && now - s.ts < SESSION_WINDOW_MS)
    .sort((a, b) => b.ts - a.ts);

  if (recent.length > 0) {
    return { graph, sessionId: recent[0].id };
  }

  let updated = graph;
  const stale = sessions.filter((s) => s.outcome === null && now - s.ts >= SESSION_WINDOW_MS);
  for (const s of stale) {
    updated = updateNode(updated, "session", s.id, {
      outcome: "success",
    } as Partial<SessionNode>);
  }
  if (stale.length > 0) {
    const allActivatedIds = new Set(stale.flatMap((s) => s.skills));
    updated = decayWeights(updated, allActivatedIds, 0.05, 0.1);
    updated = pruneSessions(updated, 50);
  }

  return startSession(updated, intent);
}

export function startSession(
  graph: Graph,
  intent: string,
): { graph: Graph; sessionId: string } {
  const ts = Date.now();
  const hex = Math.random().toString(16).slice(2, 6);
  const sessionId = `s_${ts}_${hex}`;

  const session: SessionNode = {
    type: "session",
    id: sessionId,
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
  if (!session) return graph;

  const updatedSkills = session.skills.includes(skillId)
    ? session.skills
    : [...session.skills, skillId];
  const updatedFiles = [
    ...session.files,
    ...files.filter((f) => !session.files.includes(f)),
  ];

  let updated = updateNode(graph, "session", sessionId, {
    skills: updatedSkills,
    files: updatedFiles,
  } as Partial<SessionNode>);

  const role: "primary" | "secondary" = session.skills.length === 0 ? "primary" : "secondary";
  updated = addEdge(updated, {
    type: "session_skill",
    from: sessionId,
    to: skillId,
    role,
  });

  for (const file of files) {
    updated = addEdge(updated, {
      type: "session_file",
      from: sessionId,
      to: file,
      action: "modified",
    });
  }

  const projectEdgeIdx = updated.edges.findIndex(
    (e) => e.type === "project_skill" && e.to === skillId,
  );
  if (projectEdgeIdx >= 0) {
    const existing = updated.edges[projectEdgeIdx] as ProjectSkillEdge;
    const edges = [...updated.edges];
    edges[projectEdgeIdx] = {
      ...existing,
      w: Math.round(boostWeight(existing.w) * 10000) / 10000,
      activations: existing.activations + 1,
    };
    updated = { ...updated, edges };
  }

  for (const existingSkillId of session.skills) {
    if (existingSkillId === skillId) continue;
    const coMin = existingSkillId < skillId ? existingSkillId : skillId;
    const coMax = existingSkillId < skillId ? skillId : existingSkillId;
    const coEdgeKey = `${coMin}:${coMax}`;
    const coIdx = updated.edges.findIndex(
      (e) => {
        if (e.type !== "skill_skill") return false;
        const eMin = e.from < e.to ? e.from : e.to;
        const eMax = e.from < e.to ? e.to : e.from;
        return `${eMin}:${eMax}` === coEdgeKey;
      },
    );
    if (coIdx >= 0) {
      const existing = updated.edges[coIdx] as SkillSkillEdge;
      const edges = [...updated.edges];
      edges[coIdx] = {
        ...existing,
        w: Math.round(boostWeight(existing.w) * 10000) / 10000,
        co_activations: existing.co_activations + 1,
      };
      updated = { ...updated, edges };
    } else {
      updated = addEdge(updated, {
        type: "skill_skill",
        from: existingSkillId,
        to: skillId,
        w: 0.1,
        co_activations: 1,
      });
    }
  }

  return updated;
}

export function endSession(
  graph: Graph,
  sessionId: string,
  outcome: SessionOutcome,
  insights: string[],
): Graph {
  let updated = updateNode(graph, "session", sessionId, {
    outcome,
    insights,
  } as Partial<SessionNode>);

  const session = findNode<SessionNode>(updated, "session", sessionId);
  if (!session) return updated;

  const activatedIds = new Set(session.skills);
  updated = decayWeights(updated, activatedIds, 0.05, 0.1);
  updated = pruneSessions(updated, 50);

  return updated;
}
