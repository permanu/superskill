// SPDX-License-Identifier: Apache-2.0

import type { ExtractInput, ExtractResult, SyntaxNode } from "../types.js";
import { FileBuilder, isDeclarationName } from "./common.js";

interface Ctx {
  parentId: string;
  classId: string | null;
}

export function extractSwift(input: ExtractInput): ExtractResult {
  const builder = new FileBuilder(input.file, input.language, input.tree.rootNode);
  const ctx: Ctx = { parentId: builder.moduleId, classId: null };
  for (const child of input.tree.rootNode.namedChildren) walk(child, builder, ctx);
  return builder.finish();
}

function walkChildren(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  for (const child of node.namedChildren) walk(child, builder, ctx);
}

function typeName(node: SyntaxNode | null): string | null {
  if (!node) return null;
  if (node.type === "type_identifier" || node.type === "simple_identifier") return node.text;
  const inner = findFirst(node, "type_identifier");
  return inner?.text ?? null;
}

function findFirst(node: SyntaxNode, type: string): SyntaxNode | null {
  for (const child of node.namedChildren) {
    if (child.type === type) return child;
    const found = findFirst(child, type);
    if (found) return found;
  }
  return null;
}

function isExported(node: SyntaxNode): boolean {
  return node.namedChildren.some(
    (child) => child.type === "modifiers" && /\b(public|open)\b/.test(child.text),
  );
}

function isExtensionName(node: SyntaxNode): boolean {
  const parent = node.parent;
  if (!parent || parent.type !== "user_type") return false;
  const grand = parent.parent;
  if (!grand || grand.type !== "class_declaration") return false;
  return grand.childForFieldName("name") === parent;
}

function walk(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  switch (node.type) {
    case "import_declaration": {
      const module = node.namedChildren.find((child) => child.type === "identifier");
      const specifier = module?.text;
      if (specifier) {
        const segments = specifier.split(".");
        builder.addImport(specifier, segments[segments.length - 1] ?? specifier, node);
      }
      return;
    }
    case "class_declaration": {
      const name = typeName(node.childForFieldName("name"));
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("class", name, node, {
        parentId: ctx.parentId,
        exported: isExported(node),
      });
      builder.registerClass(symbol);
      for (const child of node.namedChildren) {
        if (child.type === "inheritance_specifier") {
          const inherits = findFirst(child, "type_identifier");
          if (inherits) builder.addUse({ from: symbol.id, name: inherits.text, kind: "references", node: inherits });
        }
      }
      const body = node.namedChildren.find((child) => child.type === "class_body" || child.type === "enum_class_body");
      if (body) {
        for (const child of body.namedChildren) {
          walk(child, builder, { parentId: symbol.id, classId: symbol.id });
        }
      }
      return;
    }
    case "protocol_declaration": {
      const name = typeName(node.childForFieldName("name"));
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("interface", name, node, {
        parentId: ctx.parentId,
        exported: isExported(node),
      });
      builder.registerClass(symbol);
      const body = node.namedChildren.find((child) => child.type === "protocol_body");
      if (body) {
        for (const child of body.namedChildren) {
          walk(child, builder, { parentId: symbol.id, classId: symbol.id });
        }
      }
      return;
    }
    case "function_declaration": {
      const name = typeName(node.childForFieldName("name"));
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol(ctx.classId ? "method" : "function", name, node, {
        parentId: ctx.parentId,
        exported: isExported(node),
      });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId });
      return;
    }
    case "protocol_function_declaration": {
      const name = typeName(node.childForFieldName("name"));
      if (!name) return;
      builder.addSymbol("method", name, node, { parentId: ctx.parentId });
      return;
    }
    case "init_declaration":
    case "deinit_declaration": {
      const symbol = builder.addSymbol("method", node.type === "init_declaration" ? "init" : "deinit", node, {
        parentId: ctx.parentId,
        exported: isExported(node),
      });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId });
      return;
    }
    case "property_declaration": {
      const nameNode = node.childForFieldName("name");
      const name = nameNode ? findFirst(nameNode, "simple_identifier")?.text : null;
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("const", name, node, {
        parentId: ctx.parentId,
        exported: isExported(node),
      });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId });
      return;
    }
    case "enum_entry": {
      const name = findFirst(node, "simple_identifier")?.text;
      if (name) builder.addSymbol("const", name, node, { parentId: ctx.parentId });
      return;
    }
    case "typealias_declaration": {
      const name = typeName(node.childForFieldName("name"));
      if (!name) return;
      const symbol = builder.addSymbol("type", name, node, { parentId: ctx.parentId, exported: isExported(node) });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId });
      return;
    }
    case "call_expression": {
      handleCall(node, builder, ctx);
      walkChildren(node, builder, ctx);
      return;
    }
    case "type_identifier": {
      if (!isDeclarationName(node) && !isExtensionName(node)) {
        builder.addUse({ from: ctx.parentId, name: node.text, kind: "references", node });
      }
      return;
    }
    default:
      walkChildren(node, builder, ctx);
  }
}

function handleCall(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  const callee = node.namedChildren[0];
  if (!callee) return;
  if (callee.type === "simple_identifier") {
    builder.addUse({ from: ctx.parentId, name: callee.text, kind: "calls", node });
    return;
  }
  if (callee.type === "navigation_expression") {
    const target = callee.childForFieldName("target");
    const suffix = callee.childForFieldName("suffix");
    const name = suffix ? findFirst(suffix, "simple_identifier")?.text : undefined;
    if (!name) return;
    if (target?.type === "simple_identifier" && target.text === "self") {
      builder.addUse({
        from: ctx.parentId,
        name,
        kind: "calls",
        node,
        thisUse: true,
        ...(ctx.classId ? { classId: ctx.classId } : {}),
      });
      return;
    }
    if (target?.type === "simple_identifier") {
      builder.addUse({ from: ctx.parentId, name, kind: "calls", node, qualifier: target.text });
    }
  }
}
