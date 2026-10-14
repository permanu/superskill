// SPDX-License-Identifier: Apache-2.0

/**
 * Security scanner for skill content.
 * Detects prompt injection patterns in markdown files destined for LLM context.
 * Extracted from web-discovery.ts for reuse in registry validation.
 */

export interface ScanResult {
  blocked: boolean;
  reason?: string;
  warnings: string[];
}

export const PROMPT_SCAN_NOTICE = "Prompt-injection scanning is heuristic; passing these checks does not establish that a skill or its scripts are safe.";

/**
 * Scan skill content for prompt injection patterns.
 * Skills are markdown injected into LLM context — malicious content
 * could instruct the LLM to exfiltrate data, run commands, or ignore user intent.
 */
export function scanForPromptInjection(content: string): ScanResult {
  const warnings: string[] = [];
  const lower = content.toLowerCase();

  // Hard blocks — these should never appear in a skill file
  const blockedPatterns: Array<{ pattern: RegExp; reason: string }> = [
    { pattern: /ignore (all |any )?(previous|prior|above) (instructions|prompts|context)/i, reason: "Prompt override attempt" },
    { pattern: /forget (all |everything )?(you|your|previous)/i, reason: "Memory wipe attempt" },
    { pattern: /do not (tell|inform|reveal|mention|show) (the user|anyone)/i, reason: "Secrecy instruction — skills should be transparent" },
    { pattern: /exfiltrate|steal|extract.*secret|send.*to.*http/i, reason: "Data exfiltration pattern" },
    { pattern: /send[\s\S]{0,200}?to[\s\S]{0,200}?https?:\/\//i, reason: "Data exfiltration pattern" },
    { pattern: /(?:curl|wget)\s+[^\n|]{0,300}\|\s*(?:sudo\s+)?(?:ba|z|d|k)?sh\b/i, reason: "Remote code execution via pipe to shell" },
    { pattern: /\bpython[0-9.]*\s+-c\b/i, reason: "Inline code execution via python -c" },
    { pattern: /rm\s+-rf\s+[\/~]/i, reason: "Destructive filesystem command" },
    { pattern: /eval\s*\(.*fetch/i, reason: "Dynamic code execution from remote source" },
    { pattern: /<\s*script[\s>]/i, reason: "Script injection" },
  ];

  for (const { pattern, reason } of blockedPatterns) {
    if (pattern.test(content)) {
      return { blocked: true, reason, warnings };
    }
  }

  // Soft warnings — suspicious but not necessarily malicious
  if (lower.includes("api_key") || lower.includes("secret_key") || lower.includes("password")) {
    warnings.push("References credentials — review before loading");
  }
  if (lower.includes("sudo ") || lower.includes("chmod 777")) {
    warnings.push("Contains privileged system commands");
  }
  if ((content.match(/https?:\/\//g) || []).length > 20) {
    warnings.push("Unusually high number of external URLs");
  }
  if (lower.includes("system prompt") || lower.includes("system message")) {
    warnings.push("References system prompts — may attempt to modify LLM behavior");
  }
  if (/you are now|you must now act as/i.test(content)) {
    warnings.push("Contains role-play instructions — common in skills but review for legitimacy");
  }

  return { blocked: false, warnings };
}
