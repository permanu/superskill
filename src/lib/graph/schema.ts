// SPDX-License-Identifier: AGPL-3.0-or-later

export type NodeType = "project" | "skill" | "session";
export type EdgeType = "project_skill" | "skill_skill" | "session_skill" | "session_file";

export type AuditStatus = "pass" | "fail" | "warn" | "unknown";

export interface AuditResult {
  gen: AuditStatus;
  socket: AuditStatus;
  snyk: AuditStatus;
}

export type SkillSource = "native" | "routed";
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
}

export interface SessionNode {
  type: "session";
  id: string;
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
  nodes: Node[];
  edges: Edge[];
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
  skills: Array<{ id: string; content: string }>;
}
