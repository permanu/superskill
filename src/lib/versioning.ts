// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CommandContext } from "../core/types.js";
import { parseFrontmatter, serializeFrontmatter, createFrontmatter, mergeFrontmatter } from "../lib/frontmatter.js";
import { resolveProject } from "../config.js";

export interface VersionResult {
  version_path: string;
  version_number: number;
}

export async function snapshotVersion(
  vaultFs: import("../lib/vault-fs.js").VaultFS,
  vaultPath: string,
  filePath: string,
  existingContent: string,
): Promise<VersionResult | null> {
  try {
    const { data, content: body } = parseFrontmatter(existingContent);

    const projectMatch = filePath.match(/^projects\/([^/]+)\//);
    const projectSlug = projectMatch ? projectMatch[1] : "_shared";

    const baseName = filePath.replace(/^projects\/[^/]+\//, "").replace(/\.md$/, "");
    const versionDir = `projects/${projectSlug}/_versions/${baseName}`;

    const files = await vaultFs.list(versionDir, 1).catch(() => []);
    let nextNum = 1;
    for (const f of files) {
      const match = f.match(/(\d+)-/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) nextNum = num + 1;
      }
    }

    const versionPath = `${versionDir}/${String(nextNum).padStart(3, "0")}-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.md`;

    const versionFm = createFrontmatter({
      type: "version",
      project: projectSlug,
      status: "archived",
      original_path: filePath,
      version: nextNum,
      original_type: data.type ?? "unknown",
      original_updated: data.updated ?? null,
    });

    await vaultFs.write(versionPath, serializeFrontmatter(versionFm, existingContent));

    return { version_path: versionPath, version_number: nextNum };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[versioning] Failed to snapshot version: ${msg}`);
    return null;
  }
}
