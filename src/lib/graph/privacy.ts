// SPDX-License-Identifier: Apache-2.0
import { createHmac, randomBytes } from "node:crypto";
import type { Graph } from "./schema.js";
import { scanForSecrets } from "../secret-scanner.js";

const processKey = randomBytes(32);
const PRIVATE_TASK = /^\[private task [a-f0-9]{32}\]$/;

export function taskHistoryLabel(task: string): string {
  const setting = process.env.SUPERSKILL_RETAIN_TASK_TEXT;
  if (setting !== undefined && setting !== "0" && setting !== "1") throw new Error("SUPERSKILL_RETAIN_TASK_TEXT must be 0 or 1");
  if (setting === "1") {
    if (scanForSecrets(task).length > 0) throw new Error("Task text containing potential credentials cannot be retained");
    return task;
  }
  if (PRIVATE_TASK.test(task)) return task;
  return `[private task ${createHmac("sha256", processKey).update(task).digest("hex").slice(0, 32)}]`;
}

export function minimizeTaskHistory(graph: Graph): Graph {
  return { ...graph, nodes: graph.nodes.map(node => node.type === "session" ? { ...node, intent: taskHistoryLabel(node.intent) } : node) };
}
