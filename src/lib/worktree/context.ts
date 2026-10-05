// SPDX-License-Identifier: Apache-2.0
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname } from "node:path";
import { detectStack } from "../stack-detector.js";
import type { ProviderContext } from "../toolchains/types.js";
import { cacheNamespace, resolveRepoIdentity, worktreeKey } from "./paths.js";
import { listWorktrees } from "./safety.js";

export interface BuiltContext {
  ctx: ProviderContext;
  repoRoot: string;
  repoId: string;
  remoteHash: string | null;
  stacks: string[];
}

export async function mainWorktreeRoot(worktreeRoot: string): Promise<string> {
  const worktrees = await listWorktrees(worktreeRoot);
  if (worktrees.length > 0) return worktrees[0].path;
  const identity = await resolveRepoIdentity(worktreeRoot);
  if (identity.commonDir && basename(identity.commonDir) === ".git") {
    return dirname(identity.commonDir);
  }
  return identity.topLevel ?? worktreeRoot;
}

export async function buildProviderContext(worktreeRoot: string): Promise<BuiltContext> {
  const identity = await resolveRepoIdentity(worktreeRoot);
  const repoRoot = await mainWorktreeRoot(worktreeRoot);
  let projectFiles: string[] = [];
  try {
    projectFiles = await readdir(repoRoot);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "EACCES") {
      console.error(`[worktree-context] failed to read ${repoRoot}: ${code ?? e}`);
    }
  }
  const stack = await detectStack(repoRoot);
  const ctx: ProviderContext = {
    projectRoot: repoRoot,
    worktreeRoot,
    repoId: identity.repoId,
    cacheNamespace: cacheNamespace(identity.repoId),
    worktreeKey: worktreeKey(worktreeRoot),
    home: homedir(),
    projectFiles,
  };
  return {
    ctx,
    repoRoot,
    repoId: identity.repoId,
    remoteHash: identity.remoteHash,
    stacks: stack.languages,
  };
}
