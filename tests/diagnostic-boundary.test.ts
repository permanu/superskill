// SPDX-License-Identifier: Apache-2.0
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import ts from "typescript";

describe("governed diagnostic boundaries", () => {
  it.each(["src/mcp-server.ts", "src/lib/vault-fs.ts"])("prevents direct diagnostic sinks in %s", async path => {
    const source = ts.createSourceFile(path, await readFile(new URL(`../${path}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
    const violations: number[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && node.text === "console") violations.push(source.getLineAndCharacterOfPosition(node.getStart()).line + 1);
      if (ts.isPropertyAccessExpression(node) && node.expression.getText(source) === "process" && node.name.text === "stderr") violations.push(source.getLineAndCharacterOfPosition(node.getStart()).line + 1);
      ts.forEachChild(node, visit);
    };
    visit(source);
    expect(violations).toEqual([]);
  });
});
