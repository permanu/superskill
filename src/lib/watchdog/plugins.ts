// SPDX-License-Identifier: Apache-2.0
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CLIENT_REGISTRY } from "../../setup/clients.js";
import { currentPlatform, resolveHome } from "../../setup/types.js";
import type { Finding, SessionTrace } from "./types.js";
import { findingId } from "./detectors.js";

const MIN_SESSIONS = 5;

const MCP_NAME_RE = /^(?:mcp__([A-Za-z0-9-]+)__|(?:superskill|mcp)[._]([A-Za-z0-9-]+)[._])/;

export function mcpServerOf(toolName: string): string | null {
  const match = MCP_NAME_RE.exec(toolName);
  if (!match) return null;
  const server = match[1] ?? match[2];
  return server && server !== "superskill" ? server : null;
}

interface ClientMcpConfig {
  mcpServers?: Record<string, unknown>;
  mcp?: Record<string, unknown>;
}

export async function configuredMcpServers(): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (currentPlatform() === "win32") return result;

  for (const client of CLIENT_REGISTRY) {
    const configPath = resolveHome(client.mcpConfigPaths[currentPlatform()]);
    if (client.configFormat !== "json") continue;
    let parsed: ClientMcpConfig;
    try {
      parsed = JSON.parse(await readFile(configPath, "utf-8")) as ClientMcpConfig;
    } catch {
      continue;
    }
    const root = parsed[client.rootKey as keyof ClientMcpConfig];
    if (!root || typeof root !== "object") continue;
    const names = Object.keys(root);
    if (names.length > 0) result.set(client.slug, names);
  }
  return result;
}

export async function detectPlugins(traces: SessionTrace[]): Promise<Finding[]> {
  const findings: Finding[] = [];
  if (traces.length < MIN_SESSIONS) return findings;

  const used = new Map<string, number>();
  const errored = new Map<string, number>();
  for (const trace of traces) {
    for (const call of trace.toolCalls) {
      const server = mcpServerOf(call.name);
      if (!server) continue;
      used.set(server, (used.get(server) ?? 0) + 1);
      if (call.status === "error") errored.set(server, (errored.get(server) ?? 0) + 1);
    }
  }

  const configured = await configuredMcpServers();
  const configuredNames = new Set<string>();
  for (const names of configured.values()) for (const name of names) configuredNames.add(name);

  const unused = [...configuredNames].filter((name) => name !== "superskill" && !used.has(name));
  if (unused.length > 0) {
    findings.push({
      id: findingId("plugins", "unused-mcp-servers"),
      category: "plugins",
      severity: "medium",
      title: `${unused.length} configured MCP server${unused.length === 1 ? "" : "s"} never called in ${traces.length} sessions`,
      detail: `Configured but unused: ${unused.join(", ")}. Each server costs startup time and config surface for zero value.`,
      evidence: unused.slice(0, 8).map((name) => ({ source: "env" as const, ref: `configured, 0 calls: ${name}` })),
      proposal: `Remove unused servers from the client configs (or disable them per-project). Re-add when a task actually needs them.`,
    });
  }

  for (const [server, errors] of errored) {
    if (errors < 2) continue;
    findings.push({
      id: findingId("plugins", `erroring:${server}`),
      category: "plugins",
      severity: "medium",
      title: `MCP server "${server}" returned ${errors} errors`,
      detail: `A noisy MCP server pollutes sessions and hides real errors.`,
      evidence: [{ source: "trace", ref: `${server}: ${errors} failed calls` }],
      proposal: `Check the server's logs/config; if it stays unreliable, disable it — an unused server is cheaper than a lying one.`,
    });
  }

  return findings;
}
