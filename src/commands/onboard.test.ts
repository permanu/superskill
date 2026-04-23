// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm } from "fs/promises";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// Mock dependencies before importing the module under test
vi.mock("../setup/detect.js", () => ({
  detectClients: vi.fn(() => []),
}));

vi.mock("../setup/configure.js", () => ({
  configureClient: vi.fn(() => ({
    client: "mock",
    mcpConfigured: true,
    instructionConfigured: false,
  })),
}));

import { onboard } from "./onboard.js";
import { detectClients } from "../setup/detect.js";
import { configureClient } from "../setup/configure.js";

const mockedDetectClients = vi.mocked(detectClients);
const mockedConfigureClient = vi.mocked(configureClient);

describe("onboard", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(homedir(), `.onboard-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (existsSync(tmpDir)) {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns proper result structure", async () => {
    const result = await onboard({ vaultPath: tmpDir });

    expect(result).toHaveProperty("vaultPath", tmpDir);
    expect(result).toHaveProperty("detectedClients");
    expect(result).toHaveProperty("configuredClients");
    expect(result).toHaveProperty("installedSkills");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.detectedClients)).toBe(true);
    expect(Array.isArray(result.configuredClients)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(typeof result.installedSkills).toBe("number");
  });

  it("creates vault directory if missing", async () => {
    expect(existsSync(tmpDir)).toBe(false);

    await onboard({ vaultPath: tmpDir });

    expect(existsSync(tmpDir)).toBe(true);
  });

  it("handles no detected clients gracefully", async () => {
    mockedDetectClients.mockReturnValue([]);

    const result = await onboard({ vaultPath: tmpDir });

    expect(result.detectedClients).toEqual([]);
    expect(result.configuredClients).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("configures detected clients and reports names", async () => {
    const fakeClient = {
      config: { name: "Claude Code" } as any,
      mcpConfigPath: "/tmp/fake.json",
    } as any;

    mockedDetectClients.mockReturnValue([fakeClient]);
    mockedConfigureClient.mockReturnValue({
      client: "Claude Code",
      mcpConfigured: true,
      instructionConfigured: false,
    });

    const result = await onboard({ vaultPath: tmpDir });

    expect(result.detectedClients).toEqual(["Claude Code"]);
    expect(result.configuredClients).toEqual(["Claude Code"]);
    expect(mockedConfigureClient).toHaveBeenCalledWith(fakeClient, tmpDir);
  });

  it("includes skipped clients in configuredClients", async () => {
    const fakeClient = {
      config: { name: "Cursor" } as any,
      mcpConfigPath: "/tmp/fake.json",
    } as any;

    mockedDetectClients.mockReturnValue([fakeClient]);
    mockedConfigureClient.mockReturnValue({
      client: "Cursor",
      mcpConfigured: false,
      instructionConfigured: false,
      skipped: "MCP entry already exists",
    });

    const result = await onboard({ vaultPath: tmpDir });

    expect(result.configuredClients).toEqual(["Cursor"]);
  });

  it("reports errors without throwing", async () => {
    const fakeClient = {
      config: { name: "Broken Tool" } as any,
      mcpConfigPath: "/tmp/fake.json",
    } as any;

    mockedDetectClients.mockReturnValue([fakeClient]);
    mockedConfigureClient.mockImplementation(() => {
      throw new Error("config file corrupt");
    });

    const result = await onboard({ vaultPath: tmpDir });

    expect(result.errors).toEqual(["Broken Tool: config file corrupt"]);
    expect(result.configuredClients).toEqual([]);
  });

  it("collects errors from configureClient result", async () => {
    const fakeClient = {
      config: { name: "Partial Tool" } as any,
      mcpConfigPath: "/tmp/fake.json",
    } as any;

    mockedDetectClients.mockReturnValue([fakeClient]);
    mockedConfigureClient.mockReturnValue({
      client: "Partial Tool",
      mcpConfigured: true,
      instructionConfigured: false,
      error: "instruction write failed",
    });

    const result = await onboard({ vaultPath: tmpDir });

    expect(result.configuredClients).toEqual(["Partial Tool"]);
    expect(result.errors).toEqual(["Partial Tool: instruction write failed"]);
  });

  it("uses default vault path when none provided", async () => {
    const result = await onboard();

    expect(result.vaultPath).toBe(join(homedir(), "Vaults", "ai"));
  });
});
