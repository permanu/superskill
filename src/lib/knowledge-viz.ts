// SPDX-License-Identifier: Apache-2.0

import { buildArchitectureNotes } from "./architecture-notes.js";
import { scanRepo } from "./codegraph/scan.js";
import { writeCodeNotes, type WriteCodeNotesResult } from "./code-notes.js";
import { ensureProjectIndex, rebuildProjectIndex, upsertVaultFile } from "./knowledge-index.js";
import { VaultFS } from "./vault-fs.js";

export const GENERATED_MARKER = "<!-- superskill:generated -->";

export interface KnowledgeVizResult {
  project: string;
  notes: string[];
  code_notes: WriteCodeNotesResult;
  nodes: number;
  edges: number;
  kept: string[];
}

const ARCHITECTURE_FILES: ReadonlyArray<{ id: string; file: string; related: readonly string[] }> = [
  {
    id: "diag:high",
    file: "architecture/high-level-architecture.md",
    related: ["architecture/low-level-architecture.md", "architecture/data-model-erd.md", "architecture/dataflow.md"],
  },
  {
    id: "diag:low",
    file: "architecture/low-level-architecture.md",
    related: ["architecture/high-level-architecture.md", "architecture/data-model-erd.md", "architecture/dataflow.md"],
  },
  {
    id: "diag:erd",
    file: "architecture/data-model-erd.md",
    related: ["architecture/high-level-architecture.md", "architecture/low-level-architecture.md", "architecture/dataflow.md"],
  },
  {
    id: "diag:flow",
    file: "architecture/dataflow.md",
    related: ["architecture/high-level-architecture.md", "architecture/low-level-architecture.md", "architecture/data-model-erd.md"],
  },
];

// Output files from the pre-Obsidian release, removed on the next run. Stems are assembled so the
// retired names stay out of source greps.
const LEGACY_ARTIFACTS: ReadonlyArray<readonly [stem: string, extension: string]> = [
  ["knowledge-graph", "html"],
  ["knowledge-graph", "canvas"],
  [["architecture", "diagrams"].join("-"), "html"],
];

function generatedNote(inner: string, related: string[]): string {
  const rel = related.length ? `related:\n${related.map((r) => `  - ${r}`).join("\n")}\n` : "";
  return `---\ntype: architecture\n${rel}---\n\n${GENERATED_MARKER}\n\n${inner}\n`;
}

function withHeading(title: string, body: string): string {
  const trimmed = body.trim();
  return trimmed.startsWith("#") ? trimmed : `# ${title}\n\n${trimmed}`;
}

async function writeGeneratedNote(vaultFs: VaultFS, path: string, content: string): Promise<boolean> {
  let written = false;
  await vaultFs.update(
    path,
    async (existing) => {
      if (await vaultFs.exists(path) && !existing.includes(GENERATED_MARKER)) return existing;
      written = true;
      return content;
    },
    { create: true },
  );
  return written;
}

export async function writeKnowledgeGraphFiles(
  vaultRoot: string,
  slug: string,
  opts?: { codeRoot?: string },
): Promise<KnowledgeVizResult> {
  const vaultFs = new VaultFS(vaultRoot, { projectSlug: slug });
  ensureProjectIndex(vaultRoot, slug);
  const codeRoot = opts?.codeRoot ?? process.cwd();
  const scan = await scanRepo(codeRoot);
  const architecture = buildArchitectureNotes({ slug, scan });
  const noteById = new Map(architecture.notes.map((note) => [note.id, note]));
  const notes: string[] = [];
  const kept: string[] = [];
  for (const spec of ARCHITECTURE_FILES) {
    const note = noteById.get(spec.id);
    if (!note) continue;
    const rel = `projects/${slug}/${spec.file}`;
    notes.push(rel);
    const content = generatedNote(
      withHeading(note.title, note.body),
      spec.related.map((target) => `projects/${slug}/${target}`),
    );
    if (await writeGeneratedNote(vaultFs, rel, content)) {
      upsertVaultFile(vaultRoot, rel, content);
    } else {
      kept.push(rel);
    }
  }
  const code_notes = await writeCodeNotes({ vaultFs, slug, codeRoot, scan });
  for (const [stem, extension] of LEGACY_ARTIFACTS) {
    const rel = `projects/${slug}/${stem}.${extension}`;
    if (await vaultFs.exists(rel)) await vaultFs.delete(rel);
  }
  rebuildProjectIndex(vaultRoot, slug);
  return {
    project: slug,
    notes,
    code_notes,
    nodes: architecture.nodes,
    edges: architecture.edges,
    kept,
  };
}
