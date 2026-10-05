// SPDX-License-Identifier: Apache-2.0

import type { ExtractInput, ExtractResult, SyntaxNode } from "../types.js";
import { FileBuilder, hasAncestor, isCTagDeclarationName } from "./common.js";

interface Ctx {
  parentId: string;
  classId: string | null;
}

export function extractC(input: ExtractInput): ExtractResult {
  const builder = new FileBuilder(input.file, input.language, input.tree.rootNode);
  const ctx: Ctx = { parentId: builder.moduleId, classId: null };
  for (const child of input.tree.rootNode.namedChildren) walk(child, builder, ctx);
  return builder.finish();
}

function walkChildren(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  for (const child of node.namedChildren) walk(child, builder, ctx);
}

export function includeSpecifier(node: SyntaxNode): string | null {
  const path = node.childForFieldName("path");
  if (!path) return null;
  if (path.type === "system_lib_string") {
    return path.text;
  }
  if (path.type === "string_literal") {
    return path.namedChildren.find((child) => child.type === "string_content")?.text ?? path.text.replace(/"/g, "");
  }
  return path.text;
}

export function declaratorName(node: SyntaxNode | null): string | null {
  let current = node;
  while (current) {
    if (current.type === "identifier" || current.type === "field_identifier") return current.text;
    if (current.type === "qualified_identifier") {
      const name = current.childForFieldName("name");
      return name ? declaratorName(name) : current.text;
    }
    if (current.type === "destructor_name" || current.type === "operator_name") return current.text;
    current = current.childForFieldName("declarator") ?? current.namedChildren[0] ?? null;
  }
  return null;
}

function walk(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  switch (node.type) {
    case "preproc_include": {
      const specifier = includeSpecifier(node);
      if (specifier) builder.addImport(specifier, "*", node);
      return;
    }
    case "struct_specifier":
    case "union_specifier": {
      const name = node.childForFieldName("name");
      if (!name || node.childForFieldName("body") === null) {
        if (name) builder.addUse({ from: ctx.parentId, name: name.text, kind: "references", node: name });
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("class", name.text, node, { parentId: ctx.parentId });
      builder.registerClass(symbol);
      walkChildren(node, builder, { parentId: symbol.id, classId: symbol.id });
      return;
    }
    case "enum_specifier": {
      const name = node.childForFieldName("name");
      if (!name || node.childForFieldName("body") === null) {
        if (name) builder.addUse({ from: ctx.parentId, name: name.text, kind: "references", node: name });
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("type", name.text, node, { parentId: ctx.parentId });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId });
      return;
    }
    case "type_definition": {
      const declarator = node.childForFieldName("declarator");
      const name = declarator?.type === "type_identifier" ? declarator.text : null;
      if (name) {
        const inner = node.childForFieldName("type");
        const isStruct = inner?.type === "struct_specifier" || inner?.type === "union_specifier";
        builder.addSymbol(isStruct ? "class" : "type", name, node, { parentId: ctx.parentId });
      }
      walkChildren(node, builder, ctx);
      return;
    }
    case "function_definition": {
      const declarator = node.childForFieldName("declarator");
      const name = declaratorName(declarator);
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol(ctx.classId ? "method" : "function", name, node, { parentId: ctx.parentId });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId });
      return;
    }
    case "declaration": {
      const insideFunction = hasAncestor(node, "compound_statement");
      for (const child of node.namedChildren) {
        if (child.type === "function_declarator") {
          const name = declaratorName(child);
          if (name) builder.addSymbol("function", name, node, { parentId: builder.moduleId });
          continue;
        }
        if (insideFunction) continue;
        if (child.type === "init_declarator") {
          const declarator = child.childForFieldName("declarator");
          if (declarator?.type === "identifier") {
            builder.addSymbol("const", declarator.text, node, { parentId: ctx.parentId });
          }
        }
      }
      walkChildren(node, builder, ctx);
      return;
    }
    case "call_expression": {
      const fn = node.childForFieldName("function");
      if (fn?.type === "identifier") {
        builder.addUse({ from: ctx.parentId, name: fn.text, kind: "calls", node });
      }
      walkChildren(node, builder, ctx);
      return;
    }
    case "type_identifier": {
      if (!isCTagDeclarationName(node)) {
        builder.addUse({ from: ctx.parentId, name: node.text, kind: "references", node });
      }
      return;
    }
    default:
      walkChildren(node, builder, ctx);
  }
}
