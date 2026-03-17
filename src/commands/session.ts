import { SessionRegistryManager, type Session } from "../lib/session-registry.js";

export async function sessionCommand(
  registry: SessionRegistryManager,
  options: {
    action: "register" | "heartbeat" | "complete" | "list_active";
    tool?: string;
    project?: string;
    taskSummary?: string;
    filesTouched?: string[];
    sessionId?: string;
  }
): Promise<{
  session_id?: string;
  active_sessions?: Session[];
  conflicts?: Array<{
    session_id: string;
    tool: string;
    overlapping_files: string[];
    task_summary: string | null;
  }>;
}> {
  switch (options.action) {
    case "register": {
      if (!options.tool) throw new Error("Tool name required for register");
      const result = await registry.register(
        options.tool,
        options.project ?? null,
        options.taskSummary ?? null,
        options.filesTouched ?? []
      );
      return {
        session_id: result.session_id,
        conflicts: result.conflicts,
      };
    }

    case "heartbeat": {
      if (!options.sessionId) throw new Error("Session ID required for heartbeat");
      await registry.heartbeat(options.sessionId);
      return {};
    }

    case "complete": {
      if (!options.sessionId) throw new Error("Session ID required for complete");
      await registry.complete(options.sessionId, options.taskSummary);
      return {};
    }

    case "list_active": {
      const sessions = await registry.listActive();
      return { active_sessions: sessions };
    }

    default:
      throw new Error(`Unknown action: ${options.action}`);
  }
}
