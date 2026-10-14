import { describe, expect, it, vi } from "vitest";
import { CommandRegistry, createRegistry } from "./registry.js";
import type { InputSchema, MCPToolDefinition } from "./types.js";
import { createTestContext } from "../test-helpers.js";

function example(schema: InputSchema): unknown {
  if (schema.enum) return schema.enum[0];
  if (schema.type === "string") return "value";
  if (schema.type === "number" || schema.type === "integer") return schema.minimum ?? 1;
  if (schema.type === "boolean") return false;
  if (schema.type === "array") return [example(schema.items ?? {})];
  return Object.fromEntries((schema.required ?? []).map(key => [key, example(schema.properties?.[key] ?? {})]));
}

describe("shared registry input validation", () => {
  it("checks every declared command before adapting or invoking its handler", async () => {
    const { ctx, cleanup } = await createTestContext();
    try {
      const registry = createRegistry();
      for (const tool of registry.getToolDefinitions()) {
        const registration = registry.get(tool.name)!;
        const handler = vi.fn().mockResolvedValue("accepted");
        registration.handler = handler;
        const schema = tool.inputSchema;
        const valid = example(schema) as Record<string, unknown>;
        await expect(registry.execute(tool.name, valid, ctx), tool.name).resolves.toBe("accepted");
        for (const key of schema.required ?? []) {
          const missing = { ...valid };
          delete missing[key];
          await expect(registry.execute(tool.name, missing, ctx), `${tool.name}.${key} required`)
            .rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
        }
        for (const [key, property] of Object.entries(schema.properties ?? {})) {
          const invalid = property.type === "string" ? 42 : "wrong-type";
          const before = handler.mock.calls.length;
          await expect(registry.execute(tool.name, { ...valid, [key]: invalid }, ctx), `${tool.name}.${key} type`)
            .rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
          if (property.enum) {
            await expect(registry.execute(tool.name, { ...valid, [key]: "not-an-enum-member" }, ctx), `${tool.name}.${key} enum`)
              .rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
          }
          if (property.type === "number" || property.type === "integer") {
            for (const value of [NaN, Infinity, -Infinity]) {
              await expect(registry.execute(tool.name, { ...valid, [key]: value }, ctx), `${tool.name}.${key} finite`)
                .rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
            }
          }
          if (property.type === "integer") {
            await expect(registry.execute(tool.name, { ...valid, [key]: 1.5 }, ctx), `${tool.name}.${key} integer`)
              .rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
          }
          if (property.minimum !== undefined) {
            await expect(registry.execute(tool.name, { ...valid, [key]: property.minimum - 1 }, ctx), `${tool.name}.${key} minimum`)
              .rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
          }
          if (property.maximum !== undefined) {
            await expect(registry.execute(tool.name, { ...valid, [key]: property.maximum + 1 }, ctx), `${tool.name}.${key} maximum`)
              .rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
          }
          expect(handler.mock.calls.length, `${tool.name}.${key} handler`).toBe(before);
        }
      }
    } finally {
      await cleanup();
    }
  });

  it("validates constraints and nested shapes before adapters can discard malformed values", async () => {
    const registry = new CommandRegistry();
    const adaptArgs = vi.fn((raw: Record<string, unknown>) => raw);
    const handler = vi.fn().mockResolvedValue("ok");
    const toolDef: MCPToolDefinition = {
      name: "validate",
      description: "Validate",
      inputSchema: {
        type: "object",
        properties: {
          count: { type: "integer", minimum: 1, maximum: 3 },
          items: {
            type: "array", minItems: 1, maxItems: 2,
            items: {
              type: "object", properties: { name: { type: "string", minLength: 1, maxLength: 3 } },
              required: ["name"], additionalProperties: false,
            },
          },
          labels: { type: "object", additionalProperties: { type: "string" } },
        },
        required: ["count", "items"],
        additionalProperties: false,
      },
    };
    registry.register("validate", { toolDef, adaptArgs, handler });
    const { ctx, cleanup } = await createTestContext();
    const valid = { count: 2, items: [{ name: "abc" }], labels: { title: "ok" } };
    try {
      for (const invalid of [
        { ...valid, count: 1.5 }, { ...valid, count: 0 }, { ...valid, count: 4 },
        { ...valid, items: [] }, { ...valid, items: [1] }, { ...valid, items: [{}] },
        { ...valid, items: [{ name: "" }] }, { ...valid, items: [{ name: "long" }] },
        { ...valid, items: [{ name: "ok", extra: true }] },
        { ...valid, labels: { title: 42 } }, { ...valid, extra: true },
        { ...valid, items: [valid.items[0], valid.items[0], valid.items[0]] },
      ]) {
        await expect(registry.execute("validate", invalid, ctx)).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
      }
      expect(adaptArgs).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
      await expect(registry.execute("validate", valid, ctx)).resolves.toBe("ok");
    } finally {
      await cleanup();
    }
  });

  it("rejects malformed evidence instead of recording a successful default exit", async () => {
    const registry = createRegistry();
    const handler = vi.fn();
    registry.get("evidence")!.handler = handler;
    const { ctx, cleanup } = await createTestContext();
    try {
      for (const exit of ["1", null, false, 0.5, NaN, Infinity]) {
        await expect(registry.execute("evidence", { action: "add", ticket: "ticket-001", command: "false", exit }, ctx))
          .rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
      }
      expect(handler).not.toHaveBeenCalled();
    } finally {
      await cleanup();
    }
  });

  it("checks arrays and nested fields declared by real commands", async () => {
    const registry = createRegistry();
    const { ctx, cleanup } = await createTestContext();
    try {
      const cases: Array<[string, Record<string, unknown>]> = [
        ["session", { action: "register", files_touched: [42] }],
        ["capture", { items: [{ type: "learning", title: "x", content: "x", tags: [false] }] }],
        ["extract", { source: "x.md", items: [{ type: "learning", title: "x" }] }],
        ["tickets", { action: "create", tickets: [{ title: "x", requires_review: "false" }] }],
        ["spec", { action: "create", acceptance: [{ text: "x", command: false }] }],
        ["claims", { claims: [{ kind: "invented" }] }],
        ["template", { variables: { title: 42 } }],
        ["write", { path: "x.md", content: "x", frontmatter: [] }],
        ["tickets", { action: "create", tickets: [{ title: "x", requiresReview: true }] }],
      ];
      for (const [name, args] of cases) {
        const handler = vi.fn();
        registry.get(name)!.handler = handler;
        await expect(registry.execute(name, args, ctx), name).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
        expect(handler).not.toHaveBeenCalled();
      }
    } finally {
      await cleanup();
    }
  });

  it("preserves accepted finite numeric clamping and optional undefined values", async () => {
    const registry = createRegistry();
    const handler = vi.fn().mockImplementation(async args => args);
    registry.get("task")!.handler = handler;
    const { ctx, cleanup } = await createTestContext();
    try {
      await expect(registry.execute("task", { action: "list", limit: 9000.5, project: undefined }, ctx))
        .resolves.toMatchObject({ limit: 500 });
      await expect(registry.execute("task", { action: "list", limit: -2 }, ctx)).resolves.toMatchObject({ limit: 0 });
      registry.get("read")!.handler = handler;
      await expect(registry.execute("read", { path: "x.md", max_bytes: 100_000_000 }, ctx))
        .resolves.toMatchObject({ maxBytes: 10 * 1024 * 1024 });
    } finally {
      await cleanup();
    }
  });

  it("throws a classified error for a missing template", async () => {
    const registry = createRegistry();
    const { ctx, cleanup } = await createTestContext();
    try {
      await expect(registry.execute("template", { action: "get", type: "missing-template" }, ctx))
        .rejects.toMatchObject({ code: "FILE_NOT_FOUND" });
    } finally {
      await cleanup();
    }
  });

  it("rejects non-object arguments and required undefined values", async () => {
    const registry = createRegistry();
    const { ctx, cleanup } = await createTestContext();
    try {
      for (const args of [null, [], "wrong", 42, true, undefined, { path: undefined }]) {
        await expect(registry.execute("read", args, ctx)).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
      }
    } finally {
      await cleanup();
    }
  });

  it("declares workspace identity explicitly for all supported project-scoped tools", () => {
    const unscoped = new Set(["generate_context", "init", "status", "telemetry", "register", "doctor", "skill_install", "skill_list_installed", "skill_remove", "template"]);
    for (const tool of createRegistry().getToolDefinitions()) {
      if (!unscoped.has(tool.name)) {
        expect(tool.inputSchema.properties?.workspace_path, tool.name).toMatchObject({ type: "string" });
      }
    }
    const registry = new CommandRegistry();
    const registration = {
      handler: vi.fn(),
      toolDef: { name: "session", description: "Custom session", inputSchema: { type: "object" as const, properties: {} } },
    };
    registry.register("session", registration);
    expect(registration.toolDef.inputSchema.properties).toEqual({});
  });
});
