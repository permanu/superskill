// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { parseFrontmatter, serializeFrontmatter, createFrontmatter, mergeFrontmatter } from "../lib/frontmatter.js";
import { resolveProject } from "../config.js";
import { claimNumberedFile } from "./auto-number.js";

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

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const claim = await claimNumberedFile(vaultFs, versionDir, (_number, padded) => `${padded}-${timestamp}.md`, (number) => {
      const versionFm = createFrontmatter({
        type: "version",
        project: projectSlug,
        status: "archived",
        original_path: filePath,
        version: number,
        original_type: data.type ?? "unknown",
        original_updated: data.updated ?? null,
      });

      return serializeFrontmatter(versionFm, existingContent);
    });
    return { version_path: claim.path, version_number: claim.number };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[versioning] Failed to snapshot version: ${msg}`);
    return null;
  }
}
