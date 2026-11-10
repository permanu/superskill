import { createScopedCtx } from "../app-context.js";
import { createRegistry } from "./registry.js";
import { readMcpToolPolicy } from "./tool-policy.js";

export function toolManual() {
  return {
    manual_version: "1.0.0",
    utcp_version: "1.0.1",
    tools: createRegistry(readMcpToolPolicy()).getToolDefinitions().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputs: {
        type: "object",
        properties: { arguments: { type: "string", description: "JSON-encoded tool arguments", contentMediaType: "application/json", contentSchema: tool.inputSchema } },
        required: ["arguments"],
      },
      tool_call_template: {
        call_template_type: "cli",
        commands: [{ command: `superskill invoke ${tool.name} --json UTCP_ARG_arguments_UTCP_END`, append_to_final_output: true }],
      },
    })),
  };
}

export async function invokeTool(name: string, args: unknown): Promise<unknown> {
  const registry = createRegistry(readMcpToolPolicy());
  registry.validate(name, args);
  const fields = args as Record<string, unknown>;
  const project = typeof fields.project === "string" ? fields.project : undefined;
  const workspace = typeof fields.workspace_path === "string" ? fields.workspace_path : undefined;
  return registry.execute(name, args, await createScopedCtx(project, name, workspace));
}
