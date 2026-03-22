import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, mkdir } from "fs/promises";
import { join, sep } from "path";
import { tmpdir } from "os";
import { detectStack } from "./stack-detector.js";

async function mkTmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), "stack-detector-"));
}

describe("detectStack", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkTmp();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("detects Go project with echo framework", async () => {
    await writeFile(
      join(dir, "go.mod"),
      `module example.com/app\n\ngo 1.21\n\nrequire github.com/labstack/echo/v4 v4.11.0\n`
    );

    const stack = await detectStack(dir);

    expect(stack.languages).toContain("go");
    expect(stack.primary).toBe("go");
    expect(stack.frameworks).toContain("echo");
  });

  it("detects Go project without framework", async () => {
    await writeFile(
      join(dir, "go.mod"),
      `module example.com/app\n\ngo 1.21\n`
    );

    const stack = await detectStack(dir);

    expect(stack.languages).toContain("go");
    expect(stack.primary).toBe("go");
    expect(stack.frameworks).toHaveLength(0);
  });

  it("detects TypeScript/React project", async () => {
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({
        name: "my-app",
        dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
        devDependencies: { typescript: "^5.0.0" },
      })
    );

    const stack = await detectStack(dir);

    expect(stack.languages).toContain("typescript");
    expect(stack.frameworks).toContain("react");
    expect(stack.primary).toBe("typescript");
  });

  it("detects Next.js project", async () => {
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({
        name: "my-next-app",
        dependencies: { next: "^14.0.0", react: "^18.0.0" },
      })
    );

    const stack = await detectStack(dir);

    expect(stack.frameworks).toContain("next");
    expect(stack.frameworks).toContain("react");
  });

  it("detects Python Django project via requirements.txt", async () => {
    await writeFile(
      join(dir, "requirements.txt"),
      `Django==4.2.0\npsycopg2-binary==2.9.0\n`
    );

    const stack = await detectStack(dir);

    expect(stack.languages).toContain("python");
    expect(stack.frameworks).toContain("django");
    expect(stack.primary).toBe("python");
  });

  it("detects Python FastAPI project via pyproject.toml", async () => {
    await writeFile(
      join(dir, "pyproject.toml"),
      `[tool.poetry.dependencies]\npython = "^3.11"\nfastapi = "^0.100.0"\n`
    );

    const stack = await detectStack(dir);

    expect(stack.languages).toContain("python");
    expect(stack.frameworks).toContain("fastapi");
  });

  it("detects Rust project", async () => {
    await writeFile(
      join(dir, "Cargo.toml"),
      `[package]\nname = "my-app"\nversion = "0.1.0"\n`
    );

    const stack = await detectStack(dir);

    expect(stack.languages).toContain("rust");
    expect(stack.primary).toBe("rust");
  });

  it("detects Ruby on Rails project", async () => {
    await writeFile(
      join(dir, "Gemfile"),
      `source 'https://rubygems.org'\ngem 'rails', '~> 7.0.0'\n`
    );

    const stack = await detectStack(dir);

    expect(stack.languages).toContain("ruby");
    expect(stack.frameworks).toContain("rails");
    expect(stack.primary).toBe("ruby");
  });

  it("detects mixed Go + TypeScript project and picks Go as primary", async () => {
    await writeFile(join(dir, "go.mod"), `module example.com/app\n\ngo 1.21\n`);
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ dependencies: { react: "^18.0.0" } })
    );

    const stack = await detectStack(dir);

    expect(stack.languages).toContain("go");
    expect(stack.languages).toContain("typescript");
    expect(stack.primary).toBe("go");
    expect(stack.frameworks).toContain("react");
  });

  it("returns empty/unknown for an empty directory", async () => {
    const stack = await detectStack(dir);

    expect(stack.languages).toHaveLength(0);
    expect(stack.frameworks).toHaveLength(0);
    expect(stack.primary).toBe("unknown");
  });

  it("detects Makefile build tool", async () => {
    await writeFile(join(dir, "Makefile"), "build:\n\tgo build ./...\n");
    await writeFile(join(dir, "go.mod"), `module example.com/app\n\ngo 1.21\n`);

    const stack = await detectStack(dir);

    expect(stack.buildTools).toContain("make");
  });

  it("detects bun as build tool from bun.lockb presence", async () => {
    await writeFile(join(dir, "bun.lockb"), "");
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ dependencies: { react: "^18.0.0" } })
    );

    const stack = await detectStack(dir);

    expect(stack.buildTools).toContain("bun");
  });

  it("detects gin framework in Go project", async () => {
    await writeFile(
      join(dir, "go.mod"),
      `module example.com/app\n\ngo 1.21\n\nrequire github.com/gin-gonic/gin v1.9.0\n`
    );

    const stack = await detectStack(dir);

    expect(stack.frameworks).toContain("gin");
  });
});
