// SPDX-License-Identifier: Apache-2.0

import type { ExtractInput, ExtractResult, SyntaxNode } from "../types.js";
import { FileBuilder, hasAncestor, isDeclarationName, unquote } from "./common.js";

interface Ctx {
  parentId: string;
  classId: string | null;
}

export function extractGo(input: ExtractInput): ExtractResult {
  const builder = new FileBuilder(input.file, input.language, input.tree.rootNode);
  const root = input.tree.rootNode;
  collectTypes(root, builder);
  const ctx: Ctx = { parentId: builder.moduleId, classId: null };
  for (const child of root.namedChildren) walk(child, builder, ctx);
  return builder.finish();
}

function isExported(name: string): boolean {
  const first = name[0];
  return first !== undefined && first === first.toUpperCase() && first !== first.toLowerCase();
}

function collectTypes(node: SyntaxNode, builder: FileBuilder): void {
  for (const child of node.namedChildren) {
    if (child.type !== "type_declaration") continue;
    for (const spec of child.namedChildren) {
      if (spec.type !== "type_spec") continue;
      const name = spec.childForFieldName("name");
      const type = spec.childForFieldName("type");
      if (!name) continue;
      const kind = type?.type === "interface_type" ? "interface" : type?.type === "struct_type" ? "class" : "type";
      builder.addSymbol(kind, name.text, spec, { exported: isExported(name.text) });
    }
  }
}

function walkChildren(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  for (const child of node.namedChildren) walk(child, builder, ctx);
}

function walk(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  switch (node.type) {
    case "import_declaration": {
      for (const spec of node.namedChildren) {
        if (spec.type === "import_spec") handleImportSpec(spec, builder, node);
        else if (spec.type === "import_spec_list") {
          for (const inner of spec.namedChildren) {
            if (inner.type === "import_spec") handleImportSpec(inner, builder, node);
          }
        }
      }
      return;
    }
    case "type_declaration": {
      for (const spec of node.namedChildren) {
        if (spec.type !== "type_spec") continue;
        const name = spec.childForFieldName("name");
        if (!name) continue;
        const symbol = builder.resolveLocal(name.text);
        if (symbol) {
          const type = spec.childForFieldName("type");
          if (type) walk(type, builder, { parentId: symbol.id, classId: symbol.id });
        }
      }
      return;
    }
    case "function_declaration": {
      const name = node.childForFieldName("name");
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("function", name.text, node, {
        parentId: ctx.parentId,
        exported: isExported(name.text),
      });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId });
      return;
    }
    case "method_declaration": {
      const name = node.childForFieldName("name");
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const receiverType = methodReceiverType(node);
      const classSymbol = receiverType ? builder.resolveLocal(receiverType) : null;
      const parentId = classSymbol?.id ?? ctx.parentId;
      const symbol = builder.addSymbol("method", name.text, node, {
        parentId,
        exported: isExported(name.text),
      });
      walkChildren(node, builder, { parentId: symbol.id, classId: classSymbol?.id ?? ctx.classId });
      return;
    }
    case "const_declaration":
    case "var_declaration": {
      if (hasAncestor(node, "block")) {
        walkChildren(node, builder, ctx);
        return;
      }
      for (const spec of node.namedChildren) {
        if (spec.type !== "const_spec" && spec.type !== "var_spec") continue;
        for (const name of spec.namedChildren) {
          if (name.type !== "identifier") continue;
          builder.addSymbol("const", name.text, node, {
            parentId: ctx.parentId,
            exported: isExported(name.text),
          });
          break;
        }
      }
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

function handleImportSpec(spec: SyntaxNode, builder: FileBuilder, statement: SyntaxNode): void {
  const path = spec.childForFieldName("path");
  const name = spec.childForFieldName("name");
  if (!path) return;
  const specifier = unquote(path.text);
  const segments = specifier.split("/");
  const binding = name ? name.text : (segments[segments.length - 1] ?? specifier);
  builder.addImport(specifier, binding, statement);
}

function methodReceiverType(node: SyntaxNode): string | null {
  const receiver = node.childForFieldName("receiver");
  if (!receiver) return null;
  for (const param of receiver.namedChildren) {
    if (param.type !== "parameter_declaration") continue;
    const type = param.childForFieldName("type");
    if (!type) continue;
    if (type.type === "type_identifier") return type.text;
    if (type.type === "pointer_type") {
      const inner = type.namedChildren.find((child) => child.type === "type_identifier");
      if (inner) return inner.text;
    }
  }
  return null;
}

function handleCallee(callee: SyntaxNode, builder: FileBuilder, ctx: Ctx, callNode: SyntaxNode): void {
  if (callee.type === "identifier") {
    builder.addUse({ from: ctx.parentId, name: callee.text, kind: "calls", node: callNode });
    return;
  }
  if (callee.type === "selector_expression") {
    const operand = callee.childForFieldName("operand");
    const field = callee.childForFieldName("field");
    if (!field) return;
    if (operand?.type === "identifier") {
      builder.addUse({ from: ctx.parentId, name: field.text, kind: "calls", node: callNode, qualifier: operand.text });
    }
  }
}
