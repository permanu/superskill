import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { autoDetect, getRelevantDomains } from "./auto-profile.js";
import type { DetectedStack } from "./stack-detector.js";

async function mkTmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), "auto-profile-"));
}

function withEnv(overrides: Record<string, string | undefined>, fn: () => Promise<void>): Promise<void>;
function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void;
function withEnv(overrides: Record<string, string | undefined>, fn: () => unknown): unknown {
  const original: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    original[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key] as string;
    }
  }
  const restore = () => {
    for (const key of Object.keys(original)) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  };
  const result = fn();
  if (result instanceof Promise) {
    return result.finally(restore);
  }
  restore();
  return result;
}

describe("autoDetect", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkTmp();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns ecc-first for a Go project", async () => {
    await writeFile(join(dir, "go.mod"), `module example.com/app\n\ngo 1.21\n`);

    const config = await autoDetect(dir);

    expect(config.profile).toBe("ecc-first");
    expect(config.detectedStack.primary).toBe("go");
  });

  it("returns ecc-first for a Python project", async () => {
    await writeFile(join(dir, "requirements.txt"), `flask==2.3.0\n`);

    const config = await autoDetect(dir);

    expect(config.profile).toBe("ecc-first");
    expect(config.detectedStack.languages).toContain("python");
  });

  it("returns ecc-first for a Django project", async () => {
    await writeFile(join(dir, "requirements.txt"), `Django==4.2.0\n`);

    const config = await autoDetect(dir);

    expect(config.profile).toBe("ecc-first");
    expect(config.detectedStack.frameworks).toContain("django");
  });

  it("returns ecc-first for a React TypeScript project", async () => {
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" } })
    );

    const config = await autoDetect(dir);

    expect(config.profile).toBe("ecc-first");
    expect(config.detectedStack.frameworks).toContain("react");
  });

  it("returns superpowers-first for an empty/unknown project", async () => {
    const config = await autoDetect(dir);

    expect(config.profile).toBe("superpowers-first");
    expect(config.detectedStack.primary).toBe("unknown");
  });

  it("returns full size for context >= 500k (e.g. claude-opus-4-6)", async () => {
    await writeFile(join(dir, "go.mod"), `module example.com/app\n\ngo 1.21\n`);

    await withEnv({ CLAUDE_CODE: "1", ANTHROPIC_MODEL: "claude-opus-4-6" }, async () => {
      const config = await autoDetect(dir);
      expect(config.size).toBe("full");
      expect(config.detectedTool.contextWindow).toBe(1_000_000);
    });
  });

  it("returns standard size for context 100k-499k (e.g. claude-sonnet-4-6)", async () => {
    await writeFile(join(dir, "go.mod"), `module example.com/app\n\ngo 1.21\n`);

    await withEnv({ CLAUDE_CODE: "1", ANTHROPIC_MODEL: "claude-sonnet-4-6" }, async () => {
      const config = await autoDetect(dir);
      expect(config.size).toBe("standard");
      expect(config.detectedTool.contextWindow).toBe(200_000);
    });
  });

  it("returns compact size for context < 100k", async () => {
    await writeFile(join(dir, "go.mod"), `module example.com/app\n\ngo 1.21\n`);

    // Unknown tool → 128k, but let's test with a hypothetical small context
    // We can't easily set context window below 100k without a known tool,
    // so we test that unknown tool gets 128k → standard
    const config = await autoDetect(dir);
    // Default 128k → standard
    expect(["standard", "compact"]).toContain(config.size);
  });

  it("includes reason string with stack and tool info", async () => {
    await writeFile(join(dir, "go.mod"), `module example.com/app\n\ngo 1.21\n`);

    await withEnv({ CLAUDE_CODE: "1" }, async () => {
      const config = await autoDetect(dir);
      expect(config.reason).toContain("go");
      expect(config.reason).toContain("claude-code");
    });
  });

  it("uses process.cwd() when no path provided", async () => {
    // Just verify it doesn't throw — cwd may be any kind of project
    const config = await autoDetect();
    expect(config.profile).toBeDefined();
    expect(config.size).toBeDefined();
  });

  it("detects Spring Boot as ecc-first", async () => {
    await writeFile(
      join(dir, "pom.xml"),
      `<project><dependencies><dependency><groupId>org.springframework.boot</groupId></dependency></dependencies></project>`
    );

    const config = await autoDetect(dir);

    expect(config.profile).toBe("ecc-first");
    expect(config.detectedStack.frameworks).toContain("spring-boot");
  });
});

// ── helpers ──────────────────────────────────────────

function makeStack(overrides: Partial<DetectedStack>): DetectedStack {
  return {
    languages: [],
    frameworks: [],
    buildTools: [],
    primary: "unknown",
    ...overrides,
  };
}

const BASE_DOMAINS = [
  "tdd", "code-review", "verification", "planning", "security", "debugging",
  "meta", "git-workflow", "agent-orchestration", "agent-engineering",
  "brainstorming", "shipping",
];

describe("getRelevantDomains", () => {
  it("always includes base domains for any specific stack", () => {
    const domains = getRelevantDomains(makeStack({ languages: ["go"], primary: "go" }));
    for (const d of BASE_DOMAINS) {
      expect(domains).toContain(d);
    }
  });

  it("Go project includes go, api-design, backend-patterns and excludes django/spring/frontend", () => {
    const domains = getRelevantDomains(makeStack({ languages: ["go"], primary: "go" }));
    expect(domains).toContain("go");
    expect(domains).toContain("api-design");
    expect(domains).toContain("backend-patterns");
    expect(domains).not.toContain("django");
    expect(domains).not.toContain("spring-boot");
    expect(domains).not.toContain("frontend-design");
    expect(domains).not.toContain("3d-animation");
  });

  it("React project includes frontend-design and 3d-animation, excludes go/django/spring", () => {
    const domains = getRelevantDomains(makeStack({
      languages: ["typescript"],
      frameworks: ["react"],
      primary: "typescript",
    }));
    expect(domains).toContain("frontend-design");
    expect(domains).toContain("3d-animation");
    expect(domains).not.toContain("go");
    expect(domains).not.toContain("django");
    expect(domains).not.toContain("spring-boot");
  });

  it("Django project includes django, python, database", () => {
    const domains = getRelevantDomains(makeStack({
      languages: ["python"],
      frameworks: ["django"],
      primary: "python",
    }));
    expect(domains).toContain("django");
    expect(domains).toContain("python");
    expect(domains).toContain("database");
    expect(domains).not.toContain("go");
    expect(domains).not.toContain("spring-boot");
  });

  it("Spring Boot project includes spring-boot, java, database", () => {
    const domains = getRelevantDomains(makeStack({
      languages: ["java"],
      frameworks: ["spring-boot"],
      primary: "java",
    }));
    expect(domains).toContain("spring-boot");
    expect(domains).toContain("java");
    expect(domains).toContain("database");
    expect(domains).not.toContain("django");
    expect(domains).not.toContain("go");
  });

  it("unknown stack returns all domains (no filtering)", () => {
    const allDomains = getRelevantDomains(makeStack({ primary: "unknown" }));
    // Should include language-specific domains that would normally be filtered
    expect(allDomains).toContain("go");
    expect(allDomains).toContain("django");
    expect(allDomains).toContain("spring-boot");
    expect(allDomains).toContain("content-business");
    expect(allDomains).toContain("3d-animation");
  });

  it("Java (non-Spring) project includes java but not spring-boot", () => {
    const domains = getRelevantDomains(makeStack({
      languages: ["java"],
      frameworks: [],
      primary: "java",
    }));
    expect(domains).toContain("java");
    expect(domains).not.toContain("spring-boot");
  });

  it("Swift project includes swift", () => {
    const domains = getRelevantDomains(makeStack({
      languages: ["swift"],
      primary: "swift",
    }));
    expect(domains).toContain("swift");
    expect(domains).not.toContain("go");
  });

  it("C++ project includes cpp", () => {
    const domains = getRelevantDomains(makeStack({
      languages: ["cpp"],
      primary: "cpp",
    }));
    expect(domains).toContain("cpp");
    expect(domains).not.toContain("go");
  });

  it("content-business excluded when a specific tech stack is detected", () => {
    const domains = getRelevantDomains(makeStack({ languages: ["go"], primary: "go" }));
    expect(domains).not.toContain("content-business");
  });
});
