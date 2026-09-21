// SPDX-License-Identifier: AGPL-3.0-or-later

import { loadConfig, resolveProject } from "./config.js";
import type { Config } from "./config.js";
import { VaultFS } from "./lib/vault-fs.js";
import { SessionRegistryManager } from "./lib/session-registry.js";
import type { CommandContext, Logger } from "./core/types.js";

let _config: Config | null = null;
let _vaultFs: VaultFS | null = null;
let _sessionRegistry: SessionRegistryManager | null = null;

export function getConfig(): Config {
  if (!_config) _config = loadConfig();
  return _config;
}

export function getVaultFs(): VaultFS {
  if (!_vaultFs) _vaultFs = new VaultFS(getConfig().vaultPath);
  return _vaultFs;
}

export function getSessionRegistry(): SessionRegistryManager {
  if (!_sessionRegistry) _sessionRegistry = new SessionRegistryManager(getConfig().vaultPath, getConfig().sessionTtlHours);
  return _sessionRegistry;
}

export const noopLog: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

export function createCtx(projectSlug?: string | null): CommandContext {
  const config = getConfig();
  const vaultFs = projectSlug === undefined
    ? getVaultFs()
    : new VaultFS(config.vaultPath, { projectSlug });
  return {
    vaultFs,
    vaultPath: config.vaultPath,
    sessionRegistry: getSessionRegistry(),
    config,
    log: noopLog,
    projectSlug,
  };
}

const UNSCOPED_TOOLS = new Set([
  "init",
  "status",
  "skill_install",
  "skill_list_installed",
  "skill_remove",
  "template",
]);

export async function createScopedCtx(
  explicitSlug?: string,
  toolName?: string,
): Promise<CommandContext> {
  if (toolName && UNSCOPED_TOOLS.has(toolName)) {
    return createCtx();
  }
  try {
    const slug = await resolveProject(getConfig().vaultPath, explicitSlug);
    return createCtx(slug);
  } catch {
    return createCtx();
  }
}
