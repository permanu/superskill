// SPDX-License-Identifier: Apache-2.0

import type { ExtractInput, ExtractResult, SyntaxNode } from "../types.js";
import { FileBuilder, hasAncestor, isDeclarationName, unquote } from "./common.js";

interface Ctx {
  parentId: string;
  classId: string | null;
  exported: boolean;
}

export function extractTypeScript(input: ExtractInput): ExtractResult {
  const builder = new FileBuilder(input.file, input.language, input.tree.rootNode);
  const ctx: Ctx = { parentId: builder.moduleId, classId: null, exported: false };
  for (const child of input.tree.rootNode.namedChildren) walk(child, builder, ctx);
  return builder.finish();
}

function walkChildren(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  for (const child of node.namedChildren) walk(child, builder, ctx);
}

function walk(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  switch (node.type) {
    case "import_statement":
      handleImport(node, builder);
      return;
    case "export_statement":
      handleExport(node, builder, ctx);
      return;
    case "function_declaration": {
      const name = node.childForFieldName("name");
      if (!name && !ctx.exported) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol(ctx.classId ? "method" : "function", name?.text ?? "default", node, {
        parentId: ctx.parentId,
        exported: ctx.exported,
      });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId, exported: false });
      return;
    }
    case "class_declaration": {
      const name = node.childForFieldName("name");
      if (!name && !ctx.exported) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("class", name?.text ?? "default", node, {
        parentId: ctx.parentId,
        exported: ctx.exported,
      });
      builder.registerClass(symbol);
      const heritage = node.namedChildren.find((child) => child.type === "class_heritage");
      if (heritage) collectHeritage(heritage, builder, symbol.id);
      walkChildren(node, builder, { parentId: symbol.id, classId: symbol.id, exported: false });
      return;
    }
    case "interface_declaration": {
      const name = node.childForFieldName("name");
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("interface", name.text, node, {
        parentId: ctx.parentId,
        exported: ctx.exported,
      });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId, exported: false });
      return;
    }
    case "type_alias_declaration": {
      const name = node.childForFieldName("name");
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("type", name.text, node, {
        parentId: ctx.parentId,
        exported: ctx.exported,
      });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId, exported: false });
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
        exported: ctx.exported,
      });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId, exported: false });
      return;
    }
    case "internal_module": {
      const name = node.childForFieldName("name");
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("class", name.text, node, {
        parentId: ctx.parentId,
        exported: ctx.exported,
      });
      builder.registerClass(symbol);
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId, exported: false });
      return;
    }
    case "lexical_declaration":
    case "variable_declaration": {
      const nested = ["function_declaration", "function", "arrow_function", "generator_function", "generator_function_declaration", "method_definition"].some(
        (ancestor) => hasAncestor(node, ancestor),
      );
      for (const declarator of node.namedChildren) {
        if (declarator.type !== "variable_declarator") continue;
        const name = declarator.childForFieldName("name");
        if (nested || !name || name.type !== "identifier") {
          walkChildren(declarator, builder, ctx);
          continue;
        }
        const value = declarator.childForFieldName("value");
        const kind = value && (value.type === "arrow_function" || value.type === "function") ? "function" : "const";
        const symbol = builder.addSymbol(kind, name.text, node, {
          parentId: ctx.parentId,
          exported: ctx.exported,
        });
        walkChildren(declarator, builder, { parentId: symbol.id, classId: ctx.classId, exported: false });
      }
      return;
    }
    case "public_field_definition":
    case "field_definition": {
      const name = node.childForFieldName("name");
      if (!name || name.type !== "property_identifier") {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("const", name.text, node, { parentId: ctx.parentId });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId, exported: false });
      return;
    }
    case "method_definition": {
      const name = node.childForFieldName("name");
      if (!name) {
        walkChildren(node, builder, ctx);
        return;
      }
      const symbol = builder.addSymbol("method", name.text, node, { parentId: ctx.parentId });
      walkChildren(node, builder, { parentId: symbol.id, classId: ctx.classId, exported: false });
      return;
    }
    case "call_expression":
    case "new_expression": {
      const callee = node.childForFieldName(node.type === "new_expression" ? "constructor" : "function");
      if (callee) handleCallee(callee, builder, ctx, node);
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
  if (callee.type === "member_expression") {
    const property = callee.childForFieldName("property");
    const object = callee.childForFieldName("object");
    if (!property || property.type !== "property_identifier") return;
    const thisUse = object?.type === "this";
    if (thisUse) {
      builder.addUse({
        from: ctx.parentId,
        name: property.text,
        kind: "calls",
        node: callNode,
        thisUse: true,
        ...(ctx.classId ? { classId: ctx.classId } : {}),
      });
      return;
    }
    const qualifier = object?.type === "identifier" ? object.text : undefined;
    builder.addUse({ from: ctx.parentId, name: property.text, kind: "calls", node: callNode, ...(qualifier ? { qualifier } : {}) });
  }
}

function collectHeritage(node: SyntaxNode, builder: FileBuilder, from: string): void {
  for (const child of node.namedChildren) {
    if (child.type === "identifier" || child.type === "type_identifier") {
      builder.addUse({ from, name: child.text, kind: "references", node: child });
    }
    collectHeritage(child, builder, from);
  }
}

function handleImport(node: SyntaxNode, builder: FileBuilder): void {
  const source = node.childForFieldName("source");
  if (!source) return;
  const specifier = unquote(source.text);
  const clause = node.namedChildren.find((child) => child.type === "import_clause");
  if (!clause) {
    builder.addImport(specifier, "*", node);
    return;
  }
  for (const part of clause.namedChildren) {
    if (part.type === "identifier") {
      builder.addImport(specifier, "default", node, part.text);
    } else if (part.type === "named_imports") {
      for (const spec of part.namedChildren) {
        if (spec.type !== "import_specifier") continue;
        const name = spec.childForFieldName("name");
        const alias = spec.childForFieldName("alias");
        if (name) builder.addImport(specifier, name.text, node, alias?.text ?? name.text);
      }
    } else if (part.type === "namespace_import") {
      const local = part.namedChildren.find((child) => child.type === "identifier");
      if (local) builder.addImport(specifier, "*", node, local.text);
    }
  }
}

function handleExport(node: SyntaxNode, builder: FileBuilder, ctx: Ctx): void {
  const declaration = node.childForFieldName("declaration");
  if (declaration) {
    walk(declaration, builder, { ...ctx, exported: true });
    return;
  }
  const value = node.childForFieldName("value");
  if (value && value.type === "identifier") {
    builder.addExport(value.text, value);
    return;
  }
  const source = node.childForFieldName("source");
  const specifier = source ? unquote(source.text) : null;
  let hasClause = false;
  for (const child of node.namedChildren) {
    if (child.type === "export_clause") {
      hasClause = true;
      for (const spec of child.namedChildren) {
        if (spec.type !== "export_specifier") continue;
        const name = spec.childForFieldName("name");
        const alias = spec.childForFieldName("alias");
        if (!name) continue;
        if (specifier) {
          builder.addImport(specifier, name.text, node, alias?.text ?? name.text);
        } else {
          builder.addExport(alias?.text ?? name.text, spec);
        }
      }
    } else if (child.type === "namespace_export") {
      hasClause = true;
      const local = child.namedChildren.find((grandchild) => grandchild.type === "identifier");
      if (specifier && local) builder.addImport(specifier, "*", node, local.text);
    }
  }
  if (specifier && !hasClause) {
    builder.addImport(specifier, "*", node);
  }
}
