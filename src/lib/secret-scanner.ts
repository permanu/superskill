// SPDX-License-Identifier: AGPL-3.0-or-later

export interface SecretMatch {
  type: string;
  line: number;
  snippet: string;
}

const PATTERNS: Array<{ type: string; pattern: RegExp }> = [
  { type: "private-key", pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { type: "api-key", pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*["']?[a-zA-Z0-9_\-]{20,}["']?/i },
  { type: "token", pattern: /(?:token|secret|password|passwd|pwd)\s*[=:]\s*["']?[a-zA-Z0-9_\-!@#$%^&*]{12,}["']?/i },
  { type: "bearer-token", pattern: /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/ },
  { type: "aws-key", pattern: /AKIA[0-9A-Z]{16}/ },
  { type: "github-token", pattern: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}/ },
  { type: "webhook-secret", pattern: /whsec_[a-zA-Z0-9]{20,}/ },
  { type: "supabase-key", pattern: /(?:eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})/ },
  { type: "slack-token", pattern: /xox[baprs]-[a-zA-Z0-9-]{10,}/ },
  { type: "stripe-key", pattern: /(?:sk|pk)_(?:test|live)_[a-zA-Z0-9]{20,}/ },
  { type: "heroku-api-key", pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ },
  { type: "encryption-key", pattern: /(?:encryption[_-]?key|enc[_-]?key)\s*[=:]\s*["']?[a-zA-Z0-9+/=]{16,}["']?/i },
];

export function scanForSecrets(content: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const { type, pattern } of PATTERNS) {
      if (pattern.test(line)) {
        matches.push({
          type,
          line: i + 1,
          snippet: line.trim().slice(0, 80),
        });
      }
    }
  }

  return matches;
}

export function formatSecretWarnings(matches: SecretMatch[]): string {
  if (matches.length === 0) return "";

  const lines: string[] = [];
  lines.push(`[vault-write] WARNING: ${matches.length} potential secret(s) detected in content. Consider storing references instead of actual values.`);
  for (const m of matches.slice(0, 5)) {
    lines.push(`  - ${m.type} (line ${m.line}): ${m.snippet}`);
  }
  if (matches.length > 5) {
    lines.push(`  - ... and ${matches.length - 5} more`);
  }
  return lines.join("\n");
}
