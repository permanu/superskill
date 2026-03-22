import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { detectTool, CONTEXT_WINDOWS } from "./tool-detector.js";

// All environment keys that could trigger a specific tool detection.
// When testing one tool we need to clear all others (and vice versa).
const ALL_TOOL_KEYS = [
  "CLAUDE_CODE",
  "CLAUDE_CODE_VAULT_PATH",
  "CLAUDE_CODE_WORKTREE",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_MODEL",
  "ANTHROPIC_MODEL",
  "CLAUDE_MODEL",
];
const ALL_TOOL_PREFIXES = ["OPENCODE_", "CURSOR_", "CODEX_", "GEMINI_"];

function clearAllToolEnv(): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(process.env)) {
    const isToolKey =
      ALL_TOOL_KEYS.includes(key) ||
      ALL_TOOL_PREFIXES.some((p) => key.startsWith(p));
    if (isToolKey) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  }
  return saved;
}

function restoreToolEnv(saved: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
  // First clear ALL tool env vars to prevent cross-contamination from the
  // host environment (e.g. CLAUDE_CODE_VAULT_PATH set by Claude Code itself).
  const savedAll = clearAllToolEnv();

  // Then apply only the vars specified by this test.
  const original: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    original[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key] as string;
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(original)) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
    restoreToolEnv(savedAll);
  }
}


describe("detectTool", () => {
  describe("claude-code detection", () => {
    it("detects CLAUDE_CODE env var", () => {
      withEnv({ CLAUDE_CODE: "1" }, () => {
        const result = detectTool();
        expect(result.tool).toBe("claude-code");
      });
    });

    it("detects CLAUDE_CODE_VAULT_PATH env var", () => {
      withEnv({ CLAUDE_CODE_VAULT_PATH: "/some/path" }, () => {
        const result = detectTool();
        expect(result.tool).toBe("claude-code");
      });
    });

    it("detects model from ANTHROPIC_MODEL", () => {
      withEnv({ CLAUDE_CODE: "1", ANTHROPIC_MODEL: "claude-opus-4-6" }, () => {
        const result = detectTool();
        expect(result.tool).toBe("claude-code");
        expect(result.model).toBe("claude-opus-4-6");
        expect(result.contextWindow).toBe(1_000_000);
      });
    });

    it("detects claude-sonnet-4-6 with 200k context", () => {
      withEnv({ CLAUDE_CODE: "1", ANTHROPIC_MODEL: "claude-sonnet-4-6" }, () => {
        const result = detectTool();
        expect(result.contextWindow).toBe(200_000);
      });
    });
  });

  describe("opencode detection", () => {
    it("detects OPENCODE_ prefix env var", () => {
      withEnv({ OPENCODE_SESSION: "abc123" }, () => {
        const result = detectTool();
        expect(result.tool).toBe("opencode");
      });
    });

    it("reads model from OPENCODE_MODEL", () => {
      withEnv({ OPENCODE_MODEL: "gpt-4o" }, () => {
        const result = detectTool();
        expect(result.tool).toBe("opencode");
        expect(result.model).toBe("gpt-4o");
        expect(result.contextWindow).toBe(128_000);
      });
    });
  });

  describe("cursor detection", () => {
    it("detects CURSOR_ prefix env var", () => {
      withEnv({ CURSOR_EDITOR: "1" }, () => {
        const result = detectTool();
        expect(result.tool).toBe("cursor");
      });
    });
  });

  describe("codex detection", () => {
    it("detects CODEX_ prefix env var", () => {
      withEnv({ CODEX_SESSION: "xyz" }, () => {
        const result = detectTool();
        expect(result.tool).toBe("codex");
      });
    });
  });

  describe("gemini-cli detection", () => {
    it("detects GEMINI_ prefix env var", () => {
      withEnv({ GEMINI_API_KEY: "key123" }, () => {
        const result = detectTool();
        expect(result.tool).toBe("gemini-cli");
      });
    });

    it("reads gemini model and returns 1M context", () => {
      withEnv({ GEMINI_API_KEY: "key123", GEMINI_MODEL: "gemini-2.5-pro" }, () => {
        const result = detectTool();
        expect(result.contextWindow).toBe(1_000_000);
      });
    });
  });

  describe("unknown / fallback", () => {
    it("returns unknown tool when no matching env vars", () => {
      // withEnv with empty overrides clears all tool env vars
      withEnv({}, () => {
        const result = detectTool();
        expect(result.tool).toBe("unknown");
        expect(result.contextWindow).toBe(128_000);
      });
    });

    it("uses 128000 as default context when model unknown", () => {
      // Set CLAUDE_CODE but no model env vars
      withEnv({ CLAUDE_CODE: "1" }, () => {
        const result = detectTool();
        // ANTHROPIC_MODEL / CLAUDE_MODEL are not set (cleared by withEnv)
        expect(result.tool).toBe("claude-code");
        expect(result.contextWindow).toBe(128_000);
      });
    });
  });

  describe("CONTEXT_WINDOWS mapping", () => {
    it("exports the mapping", () => {
      expect(CONTEXT_WINDOWS["claude-opus-4-6"]).toBe(1_000_000);
      expect(CONTEXT_WINDOWS["gpt-4o"]).toBe(128_000);
      expect(CONTEXT_WINDOWS["default"]).toBe(128_000);
    });
  });
});
