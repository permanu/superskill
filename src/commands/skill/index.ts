// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CommandContext } from "../../core/types.js";
import { initProject, type InitResult } from "./init.js";
import { activateSkills, type ActivateResult } from "./activate.js";

export type SkillAction = "init" | "activate";

export interface SkillCommandOptions {
  action: SkillAction;
  task?: string;
  skill_id?: string;
}

export type SkillCommandResult =
  | { action: "init"; result: InitResult }
  | { action: "activate"; result: ActivateResult };

export async function skillCommand(
  options: SkillCommandOptions,
  ctx: CommandContext,
): Promise<SkillCommandResult> {
  switch (options.action) {
    case "init": {
      const result = await initProject({}, ctx);
      return { action: "init", result };
    }

    case "activate": {
      const result = await activateSkills(
        { task: options.task, skill_id: options.skill_id },
        ctx,
      );
      return { action: "activate", result };
    }
  }
}

export { initProject } from "./init.js";
export type { InitResult } from "./init.js";
export { activateSkills } from "./activate.js";
export type { ActivateResult } from "./activate.js";
