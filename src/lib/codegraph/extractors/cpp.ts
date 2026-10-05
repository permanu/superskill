// SPDX-License-Identifier: Apache-2.0

import type { ExtractInput, ExtractResult, SyntaxNode } from "../types.js";
import { FileBuilder, hasAncestor, isCTagDeclarationName } from "./common.js";
import { declaratorName, includeSpecifier } from "./c.js";

interface Ctx {
  parentId: string;
  classId: string | null;
}

export function extractCpp(input: ExtractInput): ExtractResult {
  const builder = new FileBuilder(input.file, input.language, input.tree.rootNode);
  const ctx: Ctx = { parentId: builder.moduleId, classId: null };
  for (const child of input.tree.rootNode.namedChildren) walk(child, builder, ctx);
  return builder.finish();
}

function walkChildren(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  for (const child of node.namedChildren) walk(child, builder, ctx);
}

function walk(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  switch (node.type) {
    case "preproc_include": {
      const specifier = includeSpecifier(node);
      if (specifier) builder.addImport(specifier, "*", node);
      return;
    }
    case "namespace_definition": {
      const name = node.childForFieldName("name");
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("class", name.text, node, { parentId: ctx.parentId });
      builder.registerClass(symbol);
      const body = node.childForFieldName("body");
      if (body) {
        for (const child of body.namedChildren) {
          walk(child, builder, { parentId: symbol.id, classId: ctx.classId });
        }
      }
      return;
    }
    case "class_specifier":
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
      for (const child of node.namedChildren) {
        if (child.type === "base_class_clause") {
          for (const base of child.namedChildren) {
            if (base.type === "type_identifier") {
              builder.addUse({ from: symbol.id, name: base.text, kind: "references", node: base });
            }
          }
        }
      }
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
    case "function_definition": {
      const name = declaratorName(node.childForFieldName("declarator"));
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol(ctx.classId ? "method" : "function", name, node, { parentId: ctx.parentId });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId });
      return;
    }
    case "field_declaration": {
      handleFieldDeclaration(node, builder, ctx);
      walkChildren(node, builder, ctx);
      return;
    }
    case "template_declaration": {
      walkChildren(node, builder, ctx);
      return;
    }
    case "declaration": {
      const insideFunction = hasAncestor(node, "compound_statement");
      for (const child of node.namedChildren) {
        if (child.type === "function_declarator") {
          const name = declaratorName(child);
          if (name) {
            builder.addSymbol(ctx.classId ? "method" : "function", name, node, { parentId: ctx.parentId });
          }
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
      if (fn) handleCallee(fn, builder, ctx, node);
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

function handleFieldDeclaration(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  for (const child of node.namedChildren) {
    if (child.type === "function_declarator") {
      const name = declaratorName(child);
      if (name) builder.addSymbol("method", name, node, { parentId: ctx.parentId });
      continue;
    }
    if (child.type === "field_identifier") {
      builder.addSymbol("const", child.text, node, { parentId: ctx.parentId });
      continue;
    }
    if (child.type === "init_declarator") {
      const declarator = child.childForFieldName("declarator");
      if (declarator?.type === "field_identifier") {
        builder.addSymbol("const", declarator.text, node, { parentId: ctx.parentId });
      }
    }
  }
}

function handleCallee(callee: SyntaxNode, builder: FileBuilder, ctx: Ctx, callNode: SyntaxNode): void {
  if (callee.type === "identifier") {
    builder.addUse({ from: ctx.parentId, name: callee.text, kind: "calls", node: callNode });
    return;
  }
  if (callee.type === "qualified_identifier") {
    const name = callee.childForFieldName("name");
    const scope = callee.childForFieldName("scope");
    if (name) {
      builder.addUse({
        from: ctx.parentId,
        name: declaratorName(name) ?? name.text,
        kind: "calls",
        node: callNode,
        ...(scope ? { qualifier: scope.text } : {}),
      });
    }
    return;
  }
  if (callee.type === "field_expression") {
    const field = callee.childForFieldName("field");
    const value = callee.childForFieldName("value");
    if (!field) return;
    if (value?.type === "identifier") {
      builder.addUse({ from: ctx.parentId, name: field.text, kind: "calls", node: callNode, qualifier: value.text });
    } else if (value?.type === "this") {
      builder.addUse({
        from: ctx.parentId,
        name: field.text,
        kind: "calls",
        node: callNode,
        thisUse: true,
        ...(ctx.classId ? { classId: ctx.classId } : {}),
      });
    }
  }
}
