// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  isSupported,
  getParser,
  languageForExtension,
  languageForFile,
  loadLanguage,
  PARSE_TIMEOUT_MICROS,
  supportedFor,
  supportedLanguages,
} from "./grammars.js";
import { LANGUAGES } from "./types.js";

describe("grammars", () => {
  it("supports every advertised language", () => {
    for (const language of LANGUAGES) {
      const support = supportedFor(language);
      expect(support.supported, `${language} should be supported`).toBe(true);
      expect(support.wasm).not.toBeNull();
      expect(support.source).not.toBeNull();
      expect(support.extensions.length).toBeGreaterThan(0);
    }
    expect(supportedLanguages()).toEqual([...LANGUAGES]);
    expect(isSupported("go")).toBe(true);
  });

  it("maps extensions to languages", () => {
    expect(languageForExtension(".ts")).toBe("typescript");
    expect(languageForExtension("tsx")).toBe("tsx");
    expect(languageForExtension(".mts")).toBe("typescript");
    expect(languageForExtension(".py")).toBe("python");
    expect(languageForExtension(".h")).toBe("c");
    expect(languageForExtension(".hpp")).toBe("cpp");
    expect(languageForExtension(".rb")).toBeNull();
    expect(languageForFile("src/lib/thing.d.ts")).toBe("typescript");
    expect(languageForFile("Makefile")).toBeNull();
  });

  it("loads grammars lazily and retains one language instance across concurrent callers", async () => {
    const first = await loadLanguage("python");
    const second = await loadLanguage("python");
    expect(second).toBe(first);
    const concurrent = await Promise.all([loadLanguage("rust"), loadLanguage("rust"), loadLanguage("rust")]);
    expect(concurrent[0]).toBe(concurrent[1]);
    expect(concurrent[1]).toBe(concurrent[2]);
  });

  it("gives direct parser consumers a bounded, reset parser", async () => {
    const parser = await getParser();
    parser.setLanguage(await loadLanguage("typescript"));
    expect(parser.getTimeoutMicros()).toBe(PARSE_TIMEOUT_MICROS);
    parser.setTimeoutMicros(1);
    expect(() => parser.parse("const value = 1;\n".repeat(10_000))).toThrow(/Parsing failed/);
    parser.setTimeoutMicros(PARSE_TIMEOUT_MICROS);
    const reused = await getParser();
    expect(reused).toBe(parser);
    const tree = reused.parse("export const recovered = 1;");
    try {
      expect(tree.rootNode.hasError).toBe(false);
      expect(tree.rootNode.text).toBe("export const recovered = 1;");
    } finally {
      tree.delete();
    }
  });
});
