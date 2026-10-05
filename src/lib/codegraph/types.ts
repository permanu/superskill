// SPDX-License-Identifier: Apache-2.0

import type Parser from "web-tree-sitter";

export type LanguageId =
  | "typescript"
  | "tsx"
  | "python"
  | "go"
  | "rust"
  | "swift"
  | "java"
  | "c"
  | "cpp";

export const LANGUAGES: readonly LanguageId[] = [
  "typescript",
  "tsx",
  "python",
  "go",
  "rust",
  "swift",
  "java",
  "c",
  "cpp",
];

export type CodeNodeKind =
  | "module"
  | "class"
  | "function"
  | "method"
  | "interface"
  | "type"
  | "const"
  | "import-source";

export type CodeEdgeKind = "defines" | "imports" | "exports" | "references" | "calls";

export type Confidence = "EXTRACTED" | "INFERRED";

export interface Span {
  startLine: number;
  endLine: number;
}

export interface CodeNode {
  id: string;
  kind: CodeNodeKind;
  name: string;
  file: string;
  language: LanguageId | "external";
  span: Span;
  exported?: boolean;
}

export interface CodeEdge {
  from: string;
  to: string;
  kind: CodeEdgeKind;
  confidence: Confidence;
  file: string;
  span: Span;
}

export interface ImportRef {
  specifier: string;
  bindings: string[];
  span: Span;
}

export type SyntaxNode = Parser.SyntaxNode;
export type SyntaxTree = Parser.Tree;

export interface ExtractInput {
  file: string;
  source: string;
  tree: SyntaxTree;
  language: LanguageId;
}

export interface ExtractResult {
  nodes: CodeNode[];
  edges: CodeEdge[];
  imports: ImportRef[];
}

export type Extractor = (input: ExtractInput) => ExtractResult;

export interface CodeGraph {
  root: string;
  languages: LanguageId[];
  nodes: CodeNode[];
  edges: CodeEdge[];
}

export interface SerializedGraph extends CodeGraph {
  version: 1;
}

export interface GraphStats {
  files: number;
  nodes: number;
  edges: number;
  nodesByKind: Record<CodeNodeKind, number>;
  edgesByKind: Record<CodeEdgeKind, number>;
  edgesByConfidence: Record<Confidence, number>;
  parseErrors: number;
  filesSkipped: number;
}

export interface ScanOptions {
  skipDirs?: string[];
  maxFileSize?: number;
  languages?: LanguageId[];
}

export interface ScanResult {
  graph: CodeGraph;
  stats: GraphStats;
}
