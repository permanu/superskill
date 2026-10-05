// SPDX-License-Identifier: Apache-2.0

import type {
  CodeEdge,
  CodeEdgeKind,
  CodeNode,
  CodeNodeKind,
  Confidence,
  ExtractResult,
} from "../types.js";

export function nodeByName(result: ExtractResult, name: string, kind?: CodeNodeKind): CodeNode | undefined {
  return result.nodes.find((node) => node.name === name && (kind === undefined || node.kind === kind));
}

export function edgesOf(
  result: ExtractResult,
  from: string,
  kind: CodeEdgeKind,
  confidence?: Confidence,
): CodeEdge[] {
  return result.edges.filter(
    (edge) => edge.from === from && edge.kind === kind && (confidence === undefined || edge.confidence === confidence),
  );
}

export function hasEdge(
  result: ExtractResult,
  from: string,
  to: string,
  kind: CodeEdgeKind,
  confidence?: Confidence,
): boolean {
  return result.edges.some(
    (edge) =>
      edge.from === from &&
      edge.to === to &&
      edge.kind === kind &&
      (confidence === undefined || edge.confidence === confidence),
  );
}
