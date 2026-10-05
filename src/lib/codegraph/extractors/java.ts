// SPDX-License-Identifier: Apache-2.0

import type { ExtractInput, ExtractResult, SyntaxNode } from "../types.js";
import { FileBuilder, isDeclarationName } from "./common.js";

interface Ctx {
  parentId: string;
  classId: string | null;
}

export function extractJava(input: ExtractInput): ExtractResult {
  const builder = new FileBuilder(input.file, input.language, input.tree.rootNode);
  const ctx: Ctx = { parentId: builder.moduleId, classId: null };
  for (const child of input.tree.rootNode.namedChildren) walk(child, builder, ctx);
  return builder.finish();
}

function walkChildren(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  for (const child of node.namedChildren) walk(child, builder, ctx);
}

function isExported(node: SyntaxNode): boolean {
  return node.namedChildren.some((child) => child.type === "modifiers" && /\b(public|protected)\b/.test(child.text));
}

function walk(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  switch (node.type) {
    case "import_declaration": {
      const name = node.namedChildren.find((child) => child.type === "scoped_identifier");
      if (!name) return;
      const text = name.text;
      if (text.endsWith(".*")) {
        builder.addImport(text.slice(0, -2), "*", node);
        return;
      }
      const segments = text.split(".");
      const last = segments[segments.length - 1] ?? text;
      if (/^[A-Z]/.test(last)) {
        builder.addImport(text, last, node);
      } else {
        builder.addImport(segments.slice(0, -1).join("."), last, node);
      }
      return;
    }
    case "class_declaration":
    case "interface_declaration":
    case "record_declaration": {
      const name = node.childForFieldName("name");
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const kind = node.type === "interface_declaration" ? "interface" : "class";
      const symbol = builder.addSymbol(kind, name.text, node, {
        parentId: ctx.parentId,
        exported: isExported(node),
      });
      builder.registerClass(symbol);
      collectSuperTypes(node, builder, symbol.id);
      walkChildren(node, builder, { parentId: symbol.id, classId: symbol.id });
      return;
    }
    case "enum_declaration": {
      const name = node.childForFieldName("name");
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("type", name.text, node, {
        parentId: ctx.parentId,
        exported: isExported(node),
      });
      builder.registerClass(symbol);
      const body = node.namedChildren.find((child) => child.type === "enum_body");
      if (body) {
        for (const child of body.namedChildren) {
          if (child.type !== "enum_constant") continue;
          const constant = child.childForFieldName("name") ?? child.namedChildren.find((c) => c.type === "identifier");
          if (constant) builder.addSymbol("const", constant.text, child, { parentId: symbol.id });
        }
      }
      return;
    }
    case "method_declaration":
    case "constructor_declaration": {
      const name = node.childForFieldName("name");
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("method", name.text, node, {
        parentId: ctx.parentId,
        exported: isExported(node),
      });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId });
      return;
    }
    case "field_declaration":
    case "constant_declaration": {
      for (const declarator of node.namedChildren) {
        if (declarator.type !== "variable_declarator") continue;
        const name = declarator.childForFieldName("name");
        if (!name || name.type !== "identifier") continue;
        builder.addSymbol("const", name.text, declarator, {
          parentId: ctx.parentId,
          exported: isExported(node),
        });
      }
      walkChildren(node, builder, ctx);
      return;
    }
    case "method_invocation": {
      const name = node.childForFieldName("name");
      const object = node.childForFieldName("object");
      if (name) {
        if (object?.type === "this") {
          builder.addUse({
            from: ctx.parentId,
            name: name.text,
            kind: "calls",
            node,
            thisUse: true,
            ...(ctx.classId ? { classId: ctx.classId } : {}),
          });
        } else if (object?.type === "identifier") {
          builder.addUse({ from: ctx.parentId, name: name.text, kind: "calls", node, qualifier: object.text });
        } else if (!object) {
          builder.addUse({ from: ctx.parentId, name: name.text, kind: "calls", node });
        }
      }
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

function collectSuperTypes(node: SyntaxNode, builder: FileBuilder, from: string): void {
  for (const child of node.namedChildren) {
    if (child.type === "superclass" || child.type === "super_interfaces" || child.type === "extends_interfaces") {
      for (const inner of child.namedChildren) {
        if (inner.type === "type_identifier") {
          builder.addUse({ from, name: inner.text, kind: "references", node: inner });
        } else if (inner.type === "type_list") {
          for (const item of inner.namedChildren) {
            if (item.type === "type_identifier") {
              builder.addUse({ from, name: item.text, kind: "references", node: item });
            }
          }
        }
      }
    }
  }
}
