// SPDX-License-Identifier: Apache-2.0
import type { Graph, ProjectSkillEdge, SessionNode, SkillNode } from "../graph/schema.js";
import { findNodes } from "../graph/store.js";
import type { Finding } from "./types.js";
import { findingId } from "./detectors.js";

const MIN_SESSIONS = 3;
const MAX_LISTED = 12;

export function detectDeadSkills(graph: Graph): Finding[] {
  const sessions = findNodes<SessionNode>(graph, "session");
  if (sessions.length < MIN_SESSIONS) return [];

  const activations = new Map<string, number>();
  for (const edge of graph.edges) {
    if (edge.type !== "project_skill") continue;
    activations.set(edge.to, (edge as ProjectSkillEdge).activations);
  }

  const skills = findNodes<SkillNode>(graph, "skill");
  const dead = skills.filter((skill) => (activations.get(skill.id) ?? 0) === 0);
  if (dead.length === 0) return [];

  const ratio = dead.length / skills.length;
  const listed = dead.slice(0, MAX_LISTED).map((skill) => skill.id);
  const title = ratio >= 0.7 && skills.length >= 8
    ? `${dead.length}/${skills.length} skills were never activated — routing may be too narrow`
    : `${dead.length} skills never activated in ${sessions.length} sessions`;

  return [{
    id: findingId("skills", "dead-skills"),
    category: "skills",
    severity: ratio >= 0.7 && skills.length >= 8 ? "medium" : "low",
    title,
    detail: `The knowledge graph tracks ${skills.length} skills for this project; ${dead.length} have zero activations across ${sessions.length} recorded sessions. Dead skills still cost init cost and clutter the graph.`,
    evidence: [
      ...listed.map((id) => ({ source: "graph" as const, ref: `0 activations: ${id}` })),
      ...(dead.length > MAX_LISTED ? [{ source: "graph" as const, ref: `…and ${dead.length - MAX_LISTED} more` }] : []),
    ],
    proposal: `Either sharpen triggers so the skill can match real tasks, or drop it from the project graph. If the whole graph is mostly dead, run \`superskill-cli skill init\` again after pruning the catalog routing.`,
  }];
}
