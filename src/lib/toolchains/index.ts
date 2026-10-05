// SPDX-License-Identifier: Apache-2.0
import type { ProviderContext, ToolchainProvider } from "./types.js";
import { rustProvider } from "./rust.js";
import { goProvider } from "./go.js";
import { nodeProvider } from "./node.js";
import { pythonProvider } from "./python.js";
import { rubyProvider } from "./ruby.js";
import { jvmProvider } from "./jvm.js";
import { swiftProvider } from "./swift.js";
import { cppProvider } from "./cpp.js";

export type { ToolchainProvider, ProviderContext, EnvVar, CacheDirSpec, SeedSpec, PruneSpec } from "./types.js";

export const ALL_PROVIDERS: ToolchainProvider[] = [
  rustProvider,
  goProvider,
  nodeProvider,
  pythonProvider,
  rubyProvider,
  jvmProvider,
  swiftProvider,
  cppProvider,
];

export function providerById(id: string): ToolchainProvider | undefined {
  return ALL_PROVIDERS.find((p) => p.id === id);
}

export async function resolveProviders(ctx: ProviderContext): Promise<ToolchainProvider[]> {
  const results = await Promise.all(
    ALL_PROVIDERS.map(async (provider) => ({ provider, applies: await provider.detect(ctx) }))
  );
  return results.filter((r) => r.applies).map((r) => r.provider);
}
