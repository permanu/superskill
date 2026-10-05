// SPDX-License-Identifier: Apache-2.0

import type { ExtractInput, ExtractResult, SyntaxNode } from "../types.js";
import { FileBuilder, unquote } from "./common.js";

interface Ctx {
  parentId: string;
  classId: string | null;
  inFunction: boolean;
}

export function extractPython(input: ExtractInput): ExtractResult {
  const builder = new FileBuilder(input.file, input.language, input.tree.rootNode);
  const ctx: Ctx = { parentId: builder.moduleId, classId: null, inFunction: false };
  for (const child of input.tree.rootNode.namedChildren) walk(child, builder, ctx);
  return builder.finish();
}

function walkChildren(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  for (const child of node.namedChildren) walk(child, builder, ctx);
}

function lastSegment(dotted: string): string {
  const parts = dotted.split(".");
  return parts[parts.length - 1] ?? dotted;
}

function walk(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  switch (node.type) {
    case "import_statement": {
      for (const spec of node.namedChildren) {
        if (spec.type === "dotted_name") {
          const text = spec.text;
          builder.addImport(text, lastSegment(text), node, lastSegment(text));
        } else if (spec.type === "aliased_import") {
          const name = spec.childForFieldName("name");
          const alias = spec.childForFieldName("alias");
          if (name) builder.addImport(name.text, lastSegment(name.text), node, alias?.text ?? lastSegment(name.text));
        }
      }
      return;
    }
    case "import_from_statement": {
      const moduleName = node.childForFieldName("module_name");
      const specifier = moduleName ? moduleName.text : "";
      if (!specifier) {
        walkChildren(node, builder, ctx);
        return;
      }
      for (const nameNode of node.namedChildren) {
        if (nameNode === moduleName || nameNode.type === "import_prefix") continue;
        if (nameNode.type === "wildcard_import") {
          builder.addImport(specifier, "*", node);
        } else if (nameNode.type === "dotted_name") {
          builder.addImport(specifier, nameNode.text, node, nameNode.text);
        } else if (nameNode.type === "aliased_import") {
          const name = nameNode.childForFieldName("name");
          const alias = nameNode.childForFieldName("alias");
          if (name) builder.addImport(specifier, name.text, node, alias?.text ?? name.text);
        }
      }
      return;
    }
    case "class_definition": {
      const name = node.childForFieldName("name");
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("class", name.text, node, { parentId: ctx.parentId });
      builder.registerClass(symbol);
      const superclasses = node.childForFieldName("superclasses");
      if (superclasses) {
        for (const base of superclasses.namedChildren) {
          if (base.type === "identifier") {
            builder.addUse({ from: symbol.id, name: base.text, kind: "references", node: base });
          }
        }
      }
      const body = node.childForFieldName("body");
      if (body) {
        for (const child of body.namedChildren) {
          walk(child, builder, { parentId: symbol.id, classId: symbol.id, inFunction: false });
        }
      }
      return;
    }
    case "function_definition": {
      const name = node.childForFieldName("name");
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol(ctx.classId ? "method" : "function", name.text, node, {
        parentId: ctx.parentId,
      });
      const body = node.childForFieldName("body");
      if (body) {
        for (const child of body.namedChildren) {
          walk(child, builder, { parentId: symbol.id, classId: ctx.classId, inFunction: true });
        }
      }
      return;
    }
    case "decorated_definition": {
      const definition = node.childForFieldName("definition");
      if (definition) walk(definition, builder, ctx);
      return;
    }
    case "expression_statement": {
      for (const child of node.namedChildren) {
        if (child.type === "assignment") handleAssignment(child, builder, ctx);
      }
      walkChildren(node, builder, ctx);
      return;
    }
    case "call": {
      const fn = node.childForFieldName("function");
      if (fn) handleCallee(fn, builder, ctx, node);
      walkChildren(node, builder, ctx);
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
  if (callee.type === "attribute") {
    const object = callee.childForFieldName("object");
    const attribute = callee.childForFieldName("attribute");
    if (!attribute) return;
    if (object?.type === "identifier" && object.text === "self") {
      builder.addUse({
        from: ctx.parentId,
        name: attribute.text,
        kind: "calls",
        node: callNode,
        thisUse: true,
        ...(ctx.classId ? { classId: ctx.classId } : {}),
      });
      return;
    }
    let root = object;
    while (root && root.type === "attribute") {
      root = root.childForFieldName("object");
    }
    if (root?.type === "identifier") {
      builder.addUse({ from: ctx.parentId, name: attribute.text, kind: "calls", node: callNode, qualifier: root.text });
    }
  }
}

function handleAssignment(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  const left = node.childForFieldName("left");
  const right = node.childForFieldName("right");
  if (!left || left.type !== "identifier") return;
  if (left.text === "__all__" && right?.type === "list") {
    for (const element of right.namedChildren) {
      if (element.type === "string") builder.addExport(unquote(element.text), element);
    }
    return;
  }
  if (ctx.inFunction) return;
  builder.addSymbol("const", left.text, node, { parentId: ctx.parentId });
}
