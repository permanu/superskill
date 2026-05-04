// SPDX-License-Identifier: AGPL-3.0-or-later

import { loadConfig } from "./config.js";
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

export function createCtx(): CommandContext {
  return {
    vaultFs: getVaultFs(),
    vaultPath: getConfig().vaultPath,
    sessionRegistry: getSessionRegistry(),
    config: getConfig(),
    log: noopLog,
  };
}
