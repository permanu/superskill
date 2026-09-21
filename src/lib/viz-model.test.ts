import { describe, it, expect } from "vitest";
import { buildVizModel } from "./viz-model.js";

describe("buildVizModel", () => {
  it("top graph is our architecture, not a file hairball", () => {
    const model = buildVizModel({
      slug: "superskill",
      vault: {
        nodes: [{ id: "projects/s/context.md", title: "SuperSkill", type: "context" }],
        edges: [],
      },
      docs: [{ id: "projects/s/context.md", title: "SuperSkill", type: "context", body: "hello vault" }],
      code: {
        nodes: [
          { id: "src/commands/write.ts", title: "write.ts", type: "code" },
          { id: "src/lib/vault-fs.ts", title: "vault-fs.ts", type: "code" },
        ],
        edges: [{ from: "src/commands/write.ts", to: "src/lib/vault-fs.ts", type: "import" }],
      },
    });
    const titles = model.graphs.root.nodes.map((n) => n.title);
    expect(titles).toContain("Vault memory");
    expect(titles).toContain("Low-level architecture");
    expect(titles).toContain("High-level architecture");
    expect(titles).toContain("Data model (ERD)");
    expect(model.graphs.root.edges.length).toBeGreaterThanOrEqual(5);
    expect(model.graphs.vault.nodes[0].title).toBe("SuperSkill");
    expect(model.graphs.vault.nodes[0].open).toEqual({ kind: "doc", id: "projects/s/context.md" });
    expect(model.docs["projects/s/context.md"].body).toContain("hello vault");
    expect(model.docs["arch:index"].body).toContain("hello vault");
    expect(model.docs["arch:vault"].body).toContain("What is stored here");
    expect(model.graphs.impl.nodes.some((n) => n.title === "Commands")).toBe(true);
    expect(model.graphs.impl.nodes.some((n) => n.title === "Libraries")).toBe(true);
    expect(model.graphs["mod:src/commands"].nodes.some((n) => n.title === "write")).toBe(true);
  });
});
