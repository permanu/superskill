// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  isSupported,
  languageForExtension,
  languageForFile,
  loadLanguage,
  resetGrammars,
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

  it("loads grammars lazily and caches them, including after a reset", async () => {
    const first = await loadLanguage("python");
    const second = await loadLanguage("python");
    expect(second).toBe(first);
    resetGrammars();
    const third = await loadLanguage("python");
    expect(third).not.toBe(first);
  });
});
