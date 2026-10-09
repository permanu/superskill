// SPDX-License-Identifier: Apache-2.0

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "web-tree-sitter";
import { LANGUAGES, type LanguageId } from "./types.js";

export interface GrammarSupport {
  language: LanguageId;
  supported: boolean;
  wasm: string | null;
  source: "vendored" | "tree-sitter-wasms" | null;
  extensions: string[];
  reason?: string;
}

const GRAMMAR_FILES: Record<LanguageId, string> = {
  typescript: "tree-sitter-typescript.wasm",
  tsx: "tree-sitter-tsx.wasm",
  python: "tree-sitter-python.wasm",
  go: "tree-sitter-go.wasm",
  rust: "tree-sitter-rust.wasm",
  swift: "tree-sitter-swift.wasm",
  java: "tree-sitter-java.wasm",
  c: "tree-sitter-c.wasm",
  cpp: "tree-sitter-cpp.wasm",
};

const EXTENSION_MAP: Record<string, LanguageId> = {
  ".ts": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".tsx": "tsx",
  ".js": "typescript",
  ".mjs": "typescript",
  ".cjs": "typescript",
  ".jsx": "tsx",
  ".py": "python",
  ".pyi": "python",
  ".go": "go",
  ".rs": "rust",
  ".swift": "swift",
  ".java": "java",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".hh": "cpp",
  ".hxx": "cpp",
};

const EXTENSIONS_BY_LANGUAGE: Record<LanguageId, string[]> = LANGUAGES.reduce(
  (acc, language) => {
    acc[language] = Object.entries(EXTENSION_MAP)
      .filter(([, value]) => value === language)
      .map(([extension]) => extension);
    return acc;
  },
  {} as Record<LanguageId, string[]>,
);

const require = createRequire(import.meta.url);
let cachedPackageWasmDir: string | null | undefined;

function packageWasmDir(): string | null {
  if (cachedPackageWasmDir !== undefined) return cachedPackageWasmDir;
  try {
    cachedPackageWasmDir = join(dirname(require.resolve("tree-sitter-wasms/package.json")), "out");
  } catch {
    cachedPackageWasmDir = null;
  }
  return cachedPackageWasmDir;
}

export const VENDORED_GRAMMAR_DIR = fileURLToPath(new URL("./grammars/", import.meta.url));

export function resolveGrammarWasm(
  language: LanguageId,
): { path: string; source: "vendored" | "tree-sitter-wasms" } | null {
  const wasm = GRAMMAR_FILES[language];
  const vendored = join(VENDORED_GRAMMAR_DIR, wasm);
  if (existsSync(vendored)) return { path: vendored, source: "vendored" };
  const pkgDir = packageWasmDir();
  if (pkgDir) {
    const packaged = join(pkgDir, wasm);
    if (existsSync(packaged)) return { path: packaged, source: "tree-sitter-wasms" };
  }
  return null;
}

export function supportedFor(language: LanguageId): GrammarSupport {
  const resolved = resolveGrammarWasm(language);
  const base: GrammarSupport = {
    language,
    supported: resolved !== null,
    wasm: resolved?.path ?? null,
    source: resolved?.source ?? null,
    extensions: EXTENSIONS_BY_LANGUAGE[language] ?? [],
  };
  if (!resolved) {
    base.reason =
      `no grammar wasm for "${language}"; expected a vendored file at ${join(
        VENDORED_GRAMMAR_DIR,
        GRAMMAR_FILES[language],
      )} or tree-sitter-wasms@0.1.13 (install it with: npm install tree-sitter-wasms@0.1.13)`;
  }
  return base;
}

export function isSupported(language: LanguageId): boolean {
  return resolveGrammarWasm(language) !== null;
}

export function supportedLanguages(): LanguageId[] {
  return LANGUAGES.filter((language) => isSupported(language));
}

export function languageForExtension(extension: string): LanguageId | null {
  const normalized = extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  return EXTENSION_MAP[normalized] ?? null;
}

export function languageForFile(path: string): LanguageId | null {
  const name = path.split("/").pop() ?? path;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return null;
  return languageForExtension(name.slice(dot));
}

let parserPromise: Promise<Parser> | null = null;
const loadedLanguages = new Map<LanguageId, Parser.Language>();

export async function getParser(): Promise<Parser> {
  if (!parserPromise) {
    parserPromise = Parser.init().then(() => new Parser());
  }
  return parserPromise;
}

export async function loadLanguage(language: LanguageId): Promise<Parser.Language> {
  const cached = loadedLanguages.get(language);
  if (cached) return cached;
  const resolved = resolveGrammarWasm(language);
  if (!resolved) {
    throw new Error(`codegraph: unsupported grammar "${language}" — ${supportedFor(language).reason}`);
  }
  await getParser();
  const loaded = await Parser.Language.load(resolved.path);
  loadedLanguages.set(language, loaded);
  return loaded;
}

export function resetGrammars(): void {
  loadedLanguages.clear();
}
