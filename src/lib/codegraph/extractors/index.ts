// SPDX-License-Identifier: Apache-2.0

import type { Extractor, LanguageId } from "../types.js";
import { extractC } from "./c.js";
import { extractCpp } from "./cpp.js";
import { extractGo } from "./go.js";
import { extractJava } from "./java.js";
import { extractPython } from "./python.js";
import { extractRust } from "./rust.js";
import { extractSwift } from "./swift.js";
import { extractTypeScript } from "./typescript.js";

const EXTRACTORS: Record<LanguageId, Extractor> = {
  typescript: extractTypeScript,
  tsx: extractTypeScript,
  python: extractPython,
  go: extractGo,
  rust: extractRust,
  swift: extractSwift,
  java: extractJava,
  c: extractC,
  cpp: extractCpp,
};

export function extractorFor(language: LanguageId): Extractor {
  return EXTRACTORS[language];
}

export { extractC, extractCpp, extractGo, extractJava, extractPython, extractRust, extractSwift, extractTypeScript };
