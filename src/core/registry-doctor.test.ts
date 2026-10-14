import { afterEach, describe, expect, it, vi } from "vitest";
import { createRegistry } from "./registry.js";
import * as doctor from "../commands/doctor.js";
import { createTestContext } from "../test-helpers.js";

afterEach(() => vi.restoreAllMocks());

describe("doctor MCP fast mode", () => {
  it.each([true, false])("passes fast=%s to the supported command options", async fast => {
    const command = vi.spyOn(doctor, "doctorCommand").mockResolvedValue({
      version: "test", healthy: true, summary: { ok: 0, warn: 0, fail: 0, skip: 0 }, checks: [],
    });
    const { ctx, cleanup } = await createTestContext();
    try {
      await createRegistry().execute("doctor", { fast }, ctx);
      expect(command).toHaveBeenCalledWith({}, ctx, { skipCatalog: fast, skipToolchains: fast });
    } finally {
      await cleanup();
    }
  });
});
