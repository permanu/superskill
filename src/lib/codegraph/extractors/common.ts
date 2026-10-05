// SPDX-License-Identifier: Apache-2.0

import type {
  CodeEdge,
  CodeEdgeKind,
  CodeNode,
  CodeNodeKind,
  Confidence,
  ExtractResult,
  ImportRef,
  LanguageId,
  Span,
  SyntaxNode,
} from "../types.js";

export interface Binding {
  specifier: string;
  name: string;
}

export interface PendingUse {
  from: string;
  name: string;
  kind: "calls" | "references";
  node: SyntaxNode;
  qualifier?: string;
  thisUse?: boolean;
  classId?: string;
}

export function lineSpan(node: SyntaxNode): Span {
  return { startLine: node.startPosition.row + 1, endLine: node.endPosition.row + 1 };
}

export function moduleNodeId(file: string): string {
  return `file:${file}`;
}

export function symbolNodeId(file: string, name: string, startLine: number): string {
  return `sym:${file}#${name}@${startLine}`;
}

export function externalNodeId(specifier: string, binding: string): string {
  return `ext:${specifier}#${binding}`;
}

export function unquote(text: string): string {
  if (text.length >= 2) {
    const first = text[0];
    const last = text[text.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return text.slice(1, -1);
    }
  }
  return text;
}

export function baseName(path: string): string {
  return path.split("/").pop() ?? path;
}

/**
 * Accumulates one file's nodes and edges, then resolves identifier uses against
 * the symbols and imports collected in the same file. All cross-file links stay
 * as edges to `import-source` nodes; scan.ts rewires them when it can resolve a
 * specifier to a real file and symbol.
 */
export class FileBuilder {
  readonly nodes: CodeNode[] = [];
  readonly edges: CodeEdge[] = [];
  readonly moduleId: string;
  readonly uses: PendingUse[] = [];
  readonly parseErrors: number;

  private readonly nodeIds = new Set<string>();
  private readonly edgeKeys = new Set<string>();
  private readonly symbolsByName = new Map<string, CodeNode[]>();
  private readonly nodeById = new Map<string, CodeNode>();
  private readonly bindingsByName = new Map<string, Binding>();
  private readonly importRefs = new Map<string, ImportRef>();
  private readonly classMembers = new Map<string, CodeNode[]>();
  private readonly pendingExports: Array<{ name: string; node: SyntaxNode }> = [];

  constructor(
    readonly file: string,
    readonly language: LanguageId,
    root: SyntaxNode,
  ) {
    this.moduleId = moduleNodeId(file);
    this.parseErrors = root.hasError ? 1 : 0;
    this.addNode({
      id: this.moduleId,
      kind: "module",
      name: baseName(file),
      file,
      language,
      span: lineSpan(root),
    });
  }

  addNode(node: CodeNode): CodeNode {
    if (!this.nodeIds.has(node.id)) {
      this.nodeIds.add(node.id);
      this.nodeById.set(node.id, node);
      this.nodes.push(node);
    }
    return this.nodeById.get(node.id) ?? node;
  }

  addEdge(
    from: string,
    to: string,
    kind: CodeEdgeKind,
    confidence: Confidence,
    node: SyntaxNode,
  ): void {
    const key = `${from}\u0000${to}\u0000${kind}\u0000${confidence}`;
    if (this.edgeKeys.has(key)) return;
    this.edgeKeys.add(key);
    this.edges.push({ from, to, kind, confidence, file: this.file, span: lineSpan(node) });
  }

  addSymbol(
    kind: CodeNodeKind,
    name: string,
    node: SyntaxNode,
    options: { parentId?: string; exported?: boolean } = {},
  ): CodeNode {
    const id = symbolNodeId(this.file, name, node.startPosition.row + 1);
    const existing = this.nodeById.get(id);
    const symbol: CodeNode = existing ?? {
      id,
      kind,
      name,
      file: this.file,
      language: this.language,
      span: lineSpan(node),
      ...(options.exported ? { exported: true } : {}),
    };
    this.addNode(symbol);
    const parentId = options.parentId ?? this.moduleId;
    this.addEdge(parentId, symbol.id, "defines", "EXTRACTED", node);
    if (options.exported) {
      this.addEdge(this.moduleId, symbol.id, "exports", "EXTRACTED", node);
    }
    const list = this.symbolsByName.get(name);
    if (list) {
      if (!list.some((n) => n.id === symbol.id)) list.push(symbol);
    } else {
      this.symbolsByName.set(name, [symbol]);
    }
    if (kind === "method" || kind === "const") {
      const members = this.classMembers.get(parentId);
      if (members) {
        if (!members.some((n) => n.id === symbol.id)) members.push(symbol);
      } else if (parentId !== this.moduleId) {
        this.classMembers.set(parentId, [symbol]);
      }
    }
    return symbol;
  }

  registerClass(node: CodeNode): void {
    if (!this.classMembers.has(node.id)) this.classMembers.set(node.id, []);
  }

  addImport(specifier: string, binding: string, node: SyntaxNode, localName?: string): void {
    const id = externalNodeId(specifier, binding);
    this.addNode({
      id,
      kind: "import-source",
      name: specifier,
      file: this.file,
      language: "external",
      span: lineSpan(node),
    });
    this.addEdge(this.moduleId, id, "imports", "EXTRACTED", node);
    const ref = this.importRefs.get(specifier);
    if (ref) {
      if (!ref.bindings.includes(binding)) ref.bindings.push(binding);
    } else {
      this.importRefs.set(specifier, { specifier, bindings: [binding], span: lineSpan(node) });
    }
    const local = localName ?? binding;
    if (local !== "*" && !this.bindingsByName.has(local)) {
      this.bindingsByName.set(local, { specifier, name: binding });
    }
  }

  addUse(use: PendingUse): void {
    this.uses.push(use);
  }

  addExport(name: string, node: SyntaxNode): void {
    this.pendingExports.push({ name, node });
  }

  resolveLocal(name: string): CodeNode | null {
    const candidates = this.symbolsByName.get(name);
    return candidates && candidates.length > 0 ? candidates[0] : null;
  }

  finish(): ExtractResult {
    for (const use of this.uses) this.resolveUse(use);
    for (const pending of this.pendingExports) {
      const symbol = this.symbolsByName.get(pending.name)?.[0];
      if (symbol) {
        this.addEdge(this.moduleId, symbol.id, "exports", "EXTRACTED", pending.node);
      }
    }
    return { nodes: this.nodes, edges: this.edges, imports: [...this.importRefs.values()] };
  }

  private resolveUse(use: PendingUse): void {
    if (use.classId) {
      const member = (this.classMembers.get(use.classId) ?? []).find((n) => n.name === use.name);
      if (member) {
        this.addUseEdge(use, member.id, use.kind);
        return;
      }
    }
    if (use.thisUse && use.classId) {
      const member = (this.classMembers.get(use.classId) ?? []).find((n) => n.name === use.name);
      if (member) {
        this.addUseEdge(use, member.id, use.kind);
        return;
      }
    }
    if (use.qualifier) {
      const binding = this.bindingsByName.get(use.qualifier);
      if (binding) {
        this.addUseEdge(use, externalNodeId(binding.specifier, binding.name), use.kind);
        return;
      }
      const localQualifier = this.resolveLocal(use.qualifier);
      if (localQualifier) {
        this.addUseEdge(use, localQualifier.id, "references");
      }
      return;
    }
    const local = this.resolveLocal(use.name);
    if (local) {
      this.addUseEdge(use, local.id, use.kind);
      return;
    }
    const binding = this.bindingsByName.get(use.name);
    if (binding) {
      this.addUseEdge(use, externalNodeId(binding.specifier, binding.name), use.kind);
    }
  }

  private addUseEdge(use: PendingUse, to: string, kind: CodeEdgeKind): void {
    this.addEdge(use.from, to, kind, "INFERRED", use.node);
  }
}

export function isDeclarationName(node: SyntaxNode): boolean {
  const parent = node.parent;
  if (!parent) return false;
  const name = parent.childForFieldName("name");
  if (name && name.id === node.id) return true;
  const declarator = parent.childForFieldName("declarator");
  return declarator !== null && declarator.id === node.id;
}

export function hasAncestor(node: SyntaxNode, type: string): boolean {
  let current = node.parent;
  while (current) {
    if (current.type === type) return true;
    current = current.parent;
  }
  return false;
}

export function isCTagDeclarationName(node: SyntaxNode): boolean {
  const parent = node.parent;
  if (!parent) return false;
  const name = parent.childForFieldName("name");
  if (name && name.id === node.id) {
    if (
      (parent.type === "struct_specifier" ||
        parent.type === "union_specifier" ||
        parent.type === "enum_specifier") &&
      parent.childForFieldName("body") === null
    ) {
      return false;
    }
    return true;
  }
  return isDeclarationName(node);
}

export function visitNamed(node: SyntaxNode, visit: (child: SyntaxNode) => boolean | void): void {
  for (const child of node.namedChildren) {
    const descend = visit(child);
    if (descend !== false) visitNamed(child, visit);
  }
}
