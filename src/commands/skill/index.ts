import { VaultFS } from "../../lib/vault-fs.js";
import { SkillRegistryManager } from "../../lib/skill-registry.js";
import { installSkill, deleteSkill, InstallResult } from "./install.js";
import { listSkills, ListResult } from "./list.js";
import { validateSkill, ValidateResult } from "./validate.js";

export interface SkillCommandOptions {
  action: 'install' | 'list' | 'validate' | 'delete';
  source?: string;
  skillPath?: string;
  skillName?: string;
  force?: boolean;
}

export type SkillCommandResult = 
  | { action: 'install'; result: InstallResult }
  | { action: 'list'; result: ListResult }
  | { action: 'validate'; result: ValidateResult }
  | { action: 'delete'; result: InstallResult };

export async function skillCommand(
  vaultFs: VaultFS,
  vaultPath: string,
  options: SkillCommandOptions
): Promise<SkillCommandResult> {
  const registryManager = new SkillRegistryManager(vaultPath);
  
  switch (options.action) {
    case 'install': {
      if (!options.source) {
        return {
          action: 'install',
          result: {
            success: false,
            error: 'Source is required for install action',
          },
        };
      }
      const result = await installSkill(vaultFs, registryManager, {
        source: options.source,
        force: options.force,
      });
      return { action: 'install', result };
    }
    
    case 'list': {
      const result = await listSkills(registryManager);
      return { action: 'list', result };
    }
    
    case 'validate': {
      if (!options.skillPath) {
        return {
          action: 'validate',
          result: {
            valid: false,
            errors: ['Skill path is required for validate action'],
          },
        };
      }
      const result = await validateSkill({ skillPath: options.skillPath });
      return { action: 'validate', result };
    }
    
    case 'delete': {
      if (!options.skillName) {
        return {
          action: 'delete',
          result: {
            success: false,
            error: 'Skill name is required for delete action',
          },
        };
      }
      const result = await deleteSkill(vaultFs, registryManager, options.skillName);
      return { action: 'delete', result };
    }
  }
}

export { installSkill, deleteSkill } from "./install.js";
export { listSkills } from "./list.js";
export { validateSkill } from "./validate.js";
export { SkillRegistryManager } from "../../lib/skill-registry.js";
export * from "./schema.js";
