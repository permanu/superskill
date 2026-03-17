import { VaultFS } from "../lib/vault-fs.js";
import { detectProject } from "../lib/project-detector.js";
import { validateProjectSlug } from "../config.js";
import { estimateTokens, truncateToTokenBudget } from "../lib/token-estimator.js";

export interface ContextResult {
  project_slug: string;
  context_md: string;
  token_estimate: number;
  sections: string[];
  truncated: boolean;
}

export async function contextCommand(
  vaultFs: VaultFS,
  vaultPath: string,
  options: {
    project?: string;
    detailLevel?: "summary" | "full";
    maxTokens?: number;
  } = {}
): Promise<ContextResult> {
  const { detailLevel = "summary", maxTokens = 1500 } = options;
  let projectSlug = options.project ?? null;

  // Auto-detect project from cwd
  if (!projectSlug) {
    projectSlug = await detectProject(process.cwd(), vaultPath);
  }

  if (!projectSlug) {
    throw new Error(
      "Could not detect project from current directory. Use --project <slug> to specify."
    );
  }

  validateProjectSlug(projectSlug);
  const contextPath = `projects/${projectSlug}/context.md`;
  const exists = await vaultFs.exists(contextPath);

  if (!exists) {
    return {
      project_slug: projectSlug,
      context_md: `No context file found for project "${projectSlug}". Create one at: ${contextPath}`,
      token_estimate: 20,
      sections: [],
      truncated: false,
    };
  }

  const content = await vaultFs.read(contextPath);

  // Extract section headings
  const sections = content
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace("## ", "").trim());

  if (detailLevel === "full") {
    return {
      project_slug: projectSlug,
      context_md: content,
      token_estimate: estimateTokens(content),
      sections,
      truncated: false,
    };
  }

  // Summary mode: truncate to token budget
  const { text, truncated } = truncateToTokenBudget(content, maxTokens);

  return {
    project_slug: projectSlug,
    context_md: text,
    token_estimate: estimateTokens(text),
    sections,
    truncated,
  };
}
