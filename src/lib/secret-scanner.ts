// SPDX-License-Identifier: Apache-2.0

export interface SecretMatch {
  type: string;
  line: number;
  snippet: string;
}

const PATTERNS: Array<{ type: string; pattern: RegExp }> = [
  { type: "private-key", pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { type: "api-key", pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*["']?[a-zA-Z0-9_\-]{20,}["']?/i },
  { type: "generic-secret", pattern: /(?:api[_-]?key|token|secret|password)\s*[=:]\s*["']?[a-zA-Z0-9_\-]{16,}["']?/i },
  { type: "token", pattern: /(?:token|secret|password|passwd|pwd)\s*[=:]\s*["']?[a-zA-Z0-9_\-!@#$%^&*]{12,}["']?/i },
  { type: "bearer-token", pattern: /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/ },
  { type: "aws-key", pattern: /AKIA[0-9A-Z]{16}/ },
  { type: "aws-secret-key", pattern: /(?:aws[_-]?)?secret[_-]?access[_-]?key\s*[=:]\s*["']?[a-zA-Z0-9/+=]{40}["']?/i },
  { type: "github-token", pattern: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}/ },
  { type: "webhook-secret", pattern: /whsec_[a-zA-Z0-9]{20,}/ },
  { type: "supabase-key", pattern: /(?:eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})/ },
  { type: "slack-token", pattern: /xox[baprs]-[a-zA-Z0-9-]{10,}/ },
  { type: "slack-webhook", pattern: /hooks\.slack\.com\/services\/[a-zA-Z0-9\/_-]{10,}/ },
  { type: "stripe-key", pattern: /(?:sk|pk)_(?:test|live)_[a-zA-Z0-9]{20,}/ },
  { type: "anthropic-key", pattern: /\bsk-ant-[a-zA-Z0-9_-]{20,}/ },
  { type: "openai-key", pattern: /\bsk-(?!ant-)[a-zA-Z0-9_-]{20,}/ },
  { type: "google-api-key", pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { type: "heroku-api-key", pattern: /heroku[^\n]{0,40}?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i },
  { type: "encryption-key", pattern: /(?:encryption[_-]?key|enc[_-]?key)\s*[=:]\s*["']?[a-zA-Z0-9+/=]{16,}["']?/i },
];

export function scanForSecrets(content: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const detected = PATTERNS.filter(({ pattern }) => pattern.test(line));
    if (detected.length === 0) continue;
    const snippet = detected.reduce((text, { pattern }) => text.replace(new RegExp(pattern.source, `${pattern.flags}g`), "[redacted]"), line).trim().slice(0, 80);
    for (const { type } of detected) {
      matches.push({ type, line: i + 1, snippet });
    }
  }

  return matches;
}

export function formatSecretWarnings(matches: SecretMatch[]): string {
  if (matches.length === 0) return "";

  const lines: string[] = [];
  lines.push(`[vault-write] Rejected: ${matches.length} potential secret(s) in content. Store references (cred_refs), not values.`);
  for (const m of matches.slice(0, 5)) {
    lines.push(`  - ${m.type} (line ${m.line}): [redacted]`);
  }
  if (matches.length > 5) {
    lines.push(`  - ... and ${matches.length - 5} more`);
  }
  return lines.join("\n");
}
