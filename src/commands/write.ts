// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import {
  parseFrontmatter,
  serializeFrontmatter,
  createFrontmatter,
  mergeFrontmatter,
  validateFrontmatter,
  type Frontmatter,
} from "../lib/frontmatter.js";
import { scanForSecrets, formatSecretWarnings } from "../lib/secret-scanner.js";
import { snapshotVersion } from "../lib/versioning.js";
import { VaultError } from "../lib/vault-fs.js";
import { upsertVaultFile } from "../lib/knowledge-index.js";

export async function writeCommand(
  args: {
    path: string;
    content: string;
    mode?: "overwrite" | "append" | "prepend";
    frontmatter?: Partial<Frontmatter>;
  },
  ctx: CommandContext,
): Promise<{ written: boolean; path: string; bytes: number }> {
  const { path, content, mode = "append", frontmatter: fmOverrides } = args;
  const vaultFs = ctx.vaultFs;

  const secretMatches = scanForSecrets(content);
  if (secretMatches.length > 0) {
    throw new VaultError("SECRET_REJECTED", formatSecretWarnings(secretMatches));
  }

  const result = await vaultFs.update(path, async (existing) => {
    if ((mode === "append" || mode === "prepend") && existing) {
      const { data, content: body } = parseFrontmatter(existing);
      const updatedFm = mergeFrontmatter(data, fmOverrides ?? {});
      const newBody = mode === "append" ? body.trimEnd() + "\n" + content : content + "\n" + body;
      return serializeFrontmatter(updatedFm, newBody);
    }
    const fm = createFrontmatter(fmOverrides ?? {});
    const errors = validateFrontmatter(fm);
    if (errors.length > 0) throw new Error(`Invalid frontmatter: ${errors.join("; ")}`);
    if (mode === "overwrite" && existing) await snapshotVersion(vaultFs, ctx.vaultPath, vaultFs.jailPath(path), existing);
    return serializeFrontmatter(fm, content);
  }, { create: true });
  await syncIndex(ctx, path);
  return { written: true, path: result.path, bytes: result.bytes };
}

async function syncIndex(ctx: CommandContext, path: string): Promise<void> {
  try {
    const stored = ctx.vaultFs.jailPath(path);
    const raw = await ctx.vaultFs.read(path);
    upsertVaultFile(ctx.vaultPath, stored, raw);
  } catch (e: unknown) {
    console.error("[knowledge-index] sync skipped:", e instanceof Error ? e.message : e);
  }
}
