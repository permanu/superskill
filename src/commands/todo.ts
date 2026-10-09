// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { parseFrontmatter, serializeFrontmatter, createFrontmatter, mergeFrontmatter } from "../lib/frontmatter.js";
import { resolveProject } from "../config.js";
import { escapeRegex } from "../lib/escape-regex.js";

export interface TodoItem {
  text: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
}

export async function todoCommand(
  args: {
    action: "list" | "add" | "complete" | "remove";
    item?: string;
    priority?: "high" | "medium" | "low";
    project?: string;
    blockersOnly?: boolean;
  },
  ctx: CommandContext,
): Promise<{ todos: TodoItem[] }> {
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const vaultFs = ctx.vaultFs;

  const todoPath = `projects/${projectSlug}/todos.md`;
  const exists = await vaultFs.exists(todoPath);

  if (args.action === "list") {
    if (!exists) return { todos: [] };

    const content = await vaultFs.read(todoPath);
    const todos = parseTodos(content);

    if (args.blockersOnly) {
      return { todos: todos.filter((t) => t.priority === "high" && !t.completed) };
    }

    return { todos: todos.filter((t) => !t.completed) };
  }

  if (!["add", "complete", "remove"].includes(args.action)) throw new Error(`Unknown action: ${args.action}`);
  if (!args.item) throw new Error(`Item text required for ${args.action}`);
  if (args.action !== "add" && !exists) throw new Error("No todos file found");

  const result = await vaultFs.update(todoPath, (content) => {
    if (args.action === "add") {
      const line = `- [ ] ${priorityMarker(args.priority ?? "medium")}${args.item}`;
      if (!content) return serializeFrontmatter(createFrontmatter({ type: "todo", project: projectSlug }), `\n# Todos\n\n${line}\n`);
      const { data, content: body } = parseFrontmatter(content);
      return serializeFrontmatter(mergeFrontmatter(data, {}), body.trimEnd() + `\n${line}\n`);
    }
    if (args.action === "complete") {
      const updated = content.replace(
        new RegExp(`^- \\[ \\] (🔴 |🟡 |🟢 )?${escapeRegex(args.item!)}$`, "m"),
        (match) => match.replace("- [ ]", "- [x]"),
      );
      const { data, content: body } = parseFrontmatter(updated);
      return serializeFrontmatter(mergeFrontmatter(data, {}), body);
    }
    const { data, content: body } = parseFrontmatter(content);
    const pattern = new RegExp(`^- \\[([ x])\\] (🔴 |🟡 |🟢 )?${escapeRegex(args.item!)}$`);
    return serializeFrontmatter(mergeFrontmatter(data, {}), body.split("\n").filter((line) => !pattern.test(line)).join("\n"));
  }, { create: args.action === "add" });
  return { todos: parseTodos(result.content) };
}

function parseTodos(content: string): TodoItem[] {
  const { content: body } = parseFrontmatter(content);
  const todos: TodoItem[] = [];

  for (const line of body.split("\n")) {
    const match = line.match(/^- \[([ x])\] (🔴 |🟡 |🟢 )?(.+)$/);
    if (match) {
      const completed = match[1] === "x";
      const priorityEmoji = match[2]?.trim();
      const text = match[3].trim();

      let priority: "high" | "medium" | "low" = "medium";
      if (priorityEmoji === "🔴") priority = "high";
      else if (priorityEmoji === "🟢") priority = "low";

      todos.push({ text, priority, completed });
    }
  }

  return todos;
}

function priorityMarker(priority: string): string {
  switch (priority) {
    case "high": return "🔴 ";
    case "low": return "🟢 ";
    default: return "🟡 ";
  }
}
