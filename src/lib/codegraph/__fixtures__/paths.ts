// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractorFor } from "../extractors/index.js";
import { getParser, loadLanguage } from "../grammars.js";
import type { ExtractResult, LanguageId } from "../types.js";

export const FIXTURE_ROOT = fileURLToPath(new URL(".", import.meta.url));

export function fixturePath(...parts: string[]): string {
  return join(FIXTURE_ROOT, ...parts);
}

export async function extractFixture(language: LanguageId, rel: string): Promise<ExtractResult> {
  const parser = await getParser();
  parser.setLanguage(await loadLanguage(language));
  const source = await readFile(fixturePath(language, rel), "utf8");
  const tree = parser.parse(source);
  try {
    return extractorFor(language)({ file: rel, source, tree, language });
  } finally {
    tree.delete();
  }
}
