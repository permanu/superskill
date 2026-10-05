// SPDX-License-Identifier: Apache-2.0

import type { ExtractInput, ExtractResult, SyntaxNode } from "../types.js";
import { FileBuilder, hasAncestor, isDeclarationName } from "./common.js";

interface Ctx {
  parentId: string;
  classId: string | null;
}

export function extractRust(input: ExtractInput): ExtractResult {
  const builder = new FileBuilder(input.file, input.language, input.tree.rootNode);
  const root = input.tree.rootNode;
  collectItems(root, builder, builder.moduleId);
  const ctx: Ctx = { parentId: builder.moduleId, classId: null };
  for (const child of root.namedChildren) walk(child, builder, ctx);
  return builder.finish();
}

function hasVisibility(node: SyntaxNode): boolean {
  return node.namedChildren.some((child) => child.type === "visibility_modifier");
}

function collectItems(node: SyntaxNode, builder: FileBuilder, parentId: string): void {
  for (const child of node.namedChildren) {
    if (child.type === "mod_item") {
      const name = child.childForFieldName("name");
      if (!name) continue;
      const symbol = builder.addSymbol("class", name.text, child, {
        parentId,
        exported: hasVisibility(child),
      });
      builder.registerClass(symbol);
      const body = child.childForFieldName("body");
      if (body) collectItems(body, builder, symbol.id);
      continue;
    }
    if (child.type === "struct_item" || child.type === "enum_item" || child.type === "trait_item" || child.type === "type_item") {
      const name = child.childForFieldName("name");
      if (!name) continue;
      const kind = child.type === "struct_item" ? "class" : child.type === "trait_item" ? "interface" : "type";
      const symbol = builder.addSymbol(kind, name.text, child, {
        parentId,
        exported: hasVisibility(child),
      });
      if (child.type === "trait_item") builder.registerClass(symbol);
      continue;
    }
    if (child.type === "const_item" || child.type === "static_item") {
      const name = child.childForFieldName("name");
      if (!name) continue;
      builder.addSymbol("const", name.text, child, {
        parentId,
        exported: hasVisibility(child),
      });
    }
  }
}

function walkChildren(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  for (const child of node.namedChildren) walk(child, builder, ctx);
}

function walk(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  switch (node.type) {
    case "use_declaration": {
      const argument = node.childForFieldName("argument");
      if (argument) parseUse(argument, builder, node);
      return;
    }
    case "function_item": {
      const name = node.childForFieldName("name");
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const parentId = ctx.classId ?? ctx.parentId;
      const symbol = builder.addSymbol(ctx.classId ? "method" : "function", name.text, node, {
        parentId,
        exported: hasVisibility(node),
      });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId });
      return;
    }
    case "function_signature_item": {
      const name = node.childForFieldName("name");
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("method", name.text, node, { parentId: ctx.parentId });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId });
      return;
    }
    case "impl_item": {
      const type = node.childForFieldName("type");
      const trait = node.childForFieldName("trait");
      const classSymbol = type ? builder.resolveLocal(type.text) : null;
      const from = classSymbol?.id ?? ctx.parentId;
      if (classSymbol) builder.registerClass(classSymbol);
      if (trait) builder.addUse({ from, name: trait.text, kind: "references", node: trait });
      const body = node.childForFieldName("body");
      if (body) {
        for (const child of body.namedChildren) {
          walk(child, builder, { parentId: from, classId: classSymbol?.id ?? ctx.classId });
        }
      }
      return;
    }
    case "mod_item":
    case "struct_item":
    case "enum_item":
    case "trait_item":
    case "type_item": {
      const name = node.childForFieldName("name");
      const symbol = name ? builder.resolveLocal(name.text) : null;
      const parentId = symbol?.id ?? ctx.parentId;
      walkChildren(node, builder, {
        parentId,
        classId: node.type === "trait_item" || node.type === "struct_item" || node.type === "enum_item" ? parentId : ctx.classId,
      });
      return;
    }
    case "const_item":
    case "static_item": {
      if (hasAncestor(node, "block")) {
        walkChildren(node, builder, ctx);
        return;
      }
      const name = node.childForFieldName("name");
      const symbol = name ? builder.resolveLocal(name.text) : null;
      walkChildren(node, builder, { parentId: symbol?.id ?? ctx.parentId, classId: ctx.classId });
      return;
    }
    case "call_expression": {
      const fn = node.childForFieldName("function");
      if (fn) handleCallee(fn, builder, ctx, node);
      walkChildren(node, builder, ctx);
      return;
    }
    case "type_identifier": {
      if (!isDeclarationName(node)) {
        builder.addUse({ from: ctx.parentId, name: node.text, kind: "references", node });
      }
      return;
    }
    default:
      walkChildren(node, builder, ctx);
  }
}

function handleCallee(callee: SyntaxNode, builder: FileBuilder, ctx: Ctx, callNode: SyntaxNode): void {
  if (callee.type === "identifier") {
    builder.addUse({ from: ctx.parentId, name: callee.text, kind: "calls", node: callNode });
    return;
  }
  if (callee.type === "scoped_identifier") {
    const parts = callee.text.split("::");
    const name = parts.pop();
    const qualifier = parts.join("::");
    if (name && qualifier) {
      builder.addUse({ from: ctx.parentId, name, kind: "calls", node: callNode, qualifier });
    }
    return;
  }
  if (callee.type === "field_expression") {
    const field = callee.childForFieldName("field");
    const value = callee.childForFieldName("value");
    if (!field) return;
    if (value?.type === "self") {
      builder.addUse({
        from: ctx.parentId,
        name: field.text,
        kind: "calls",
        node: callNode,
        thisUse: true,
        ...(ctx.classId ? { classId: ctx.classId } : {}),
      });
      return;
    }
    if (value?.type === "identifier") {
      builder.addUse({ from: ctx.parentId, name: field.text, kind: "calls", node: callNode, qualifier: value.text });
    }
  }
}

function parseUse(argument: SyntaxNode, builder: FileBuilder, statement: SyntaxNode): void {
  switch (argument.type) {
    case "identifier":
      builder.addImport(argument.text, argument.text, statement);
      return;
    case "scoped_identifier": {
      const parts = argument.text.split("::");
      const binding = parts.pop();
      const spec = parts.join("::");
      if (binding && spec) builder.addImport(spec, binding, statement);
      else if (binding) builder.addImport(binding, binding, statement);
      return;
    }
    case "use_as_clause": {
      const path = argument.childForFieldName("path");
      const alias = argument.childForFieldName("alias");
      if (!path) return;
      const parts = path.text.split("::");
      const binding = parts.pop() ?? path.text;
      const spec = parts.join("::");
      builder.addImport(spec || binding, binding, statement, alias?.text);
      return;
    }
    case "use_wildcard": {
      const spec = argument.text.replace(/::\s*\*$/, "").replace(/\s*\*$/, "");
      builder.addImport(spec, "*", statement);
      return;
    }
    case "scoped_use_list": {
      const path = argument.childForFieldName("path");
      const list = argument.childForFieldName("list");
      const spec = path?.text ?? "";
      if (!list) return;
      for (const item of list.namedChildren) {
        if (item.type === "identifier") {
          builder.addImport(spec, item.text, statement);
        } else if (item.type === "use_as_clause") {
          const itemPath = item.childForFieldName("path");
          const alias = item.childForFieldName("alias");
          if (itemPath) builder.addImport(spec, lastTypeSegment(itemPath.text), statement, alias?.text);
        } else if (item.type === "scoped_identifier") {
          parseUse(item, builder, statement);
        }
      }
      return;
    }
    default:
      return;
  }
}

function lastTypeSegment(text: string): string {
  const parts = text.split("::");
  return parts[parts.length - 1] ?? text;
}
