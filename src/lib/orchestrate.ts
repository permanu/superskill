// SPDX-License-Identifier: AGPL-3.0-or-later
// Single SuperSkill entry: diagnose, then name specialists. Host stays one agent;
// packs are the specialists. Sequence is not a waterfall.

export interface Specialist {
  agent: string;
  pack: string;
  reason: string;
}

export interface Orchestration {
  entry: "superskill";
  defaults: string[];
  specialists: Specialist[];
  loop: boolean;
}

const DEFAULTS = ["adhd-output", "careful-minimal", "algorithm-correct"];

type Rule = {
  agent: string;
  pack: string;
  reason: string;
  re: RegExp;
  stack?: string;
};

const RULES: Rule[] = [
  { agent: "investigate", pack: "pipeline/investigate", reason: "failure/incident language", re: /\b(bug|fail|error|crash|flake|incident|regress)\b/i },
  { agent: "qa", pack: "pipeline/qa", reason: "verify in the harness browser", re: /\b(qa|e2e|visual|browser|click|viz)\b/i },
  { agent: "review", pack: "review/architect", reason: "review/merge/diff", re: /\b(review|pr\b|diff|architect)\b/i },
  { agent: "security", pack: "security/compliance", reason: "auth/tenancy/audit", re: /\b(owasp|pentest|soc2|authz?|secret|compliance|cve|xss|csrf|idor|vulnerabilit|security)\b/i },
  { agent: "tdd", pack: "pipeline/tdd", reason: "test-first slice", re: /\b(tdd|test-driven|red-green)\b/i },
  { agent: "plan", pack: "pipeline/plan", reason: "spec/grill before build", re: /\b(prd|spec|grill|brainstorm|write a plan)\b/i },
  { agent: "verify", pack: "pipeline/verify", reason: "evidence before done", re: /\b(verify|claim done|before (?:commit|merge|pr))\b/i },
  { agent: "sre", pack: "devops/sre", reason: "SLO/incident/error budget", re: /\b(slo|sre|error.?budget|on-call|toil|golden signal)\b/i },
  { agent: "platform", pack: "devops/cloud", reason: "ship/deploy/infra", re: /\b(deploy|terraform|kubernetes|rollback|aws|gcp|azure|vps)\b/i },
  { agent: "go", pack: "code/go", reason: "Go language", re: /\bgolang\b|\bgo(?:lang)?\b/i, stack: "go" },
  { agent: "rust", pack: "code/rust", reason: "Rust language", re: /\b(rust|cargo|tokio)\b/i, stack: "rust" },
  { agent: "python", pack: "code/python", reason: "Python language", re: /\b(python|django|pytest)\b/i, stack: "python" },
  { agent: "swift", pack: "code/swift", reason: "Swift language", re: /\b(swift|swiftui|ios)\b/i, stack: "swift" },
  { agent: "typescript", pack: "code/typescript", reason: "TypeScript language", re: /\b(typescript|\bts\b|javascript|node)\b/i, stack: "typescript" },
];

export function planDelegation(task: string, stack: string[] = []): Orchestration {
  const lower = task.toLowerCase();
  const stackNorm = stack.map((s) => s.toLowerCase());
  const specialists: Specialist[] = [];
  const seen = new Set<string>();

  const add = (s: Specialist) => {
    if (seen.has(s.agent)) return;
    seen.add(s.agent);
    specialists.push(s);
  };

  for (const r of RULES) {
    if (r.re.test(task)) add({ agent: r.agent, pack: r.pack, reason: r.reason });
  }

  const langByStack: Record<string, Specialist> = {
    go: { agent: "go", pack: "code/go", reason: "repo stack" },
    rust: { agent: "rust", pack: "code/rust", reason: "repo stack" },
    python: { agent: "python", pack: "code/python", reason: "repo stack" },
    swift: { agent: "swift", pack: "code/swift", reason: "repo stack" },
    typescript: { agent: "typescript", pack: "code/typescript", reason: "repo stack" },
    javascript: { agent: "typescript", pack: "code/typescript", reason: "repo stack" },
  };
  if (specialists.some((s) => s.agent === "security") && /\b(fix|bug|patch|hotfix|incident)\b/i.test(task)) {
    add({ agent: "review", pack: "review/architect", reason: "security fix needs review" });
    add({ agent: "investigate", pack: "pipeline/investigate", reason: "security incident" });
  }

  const implementish = !/\b(review|deploy|owasp|pentest|qa|e2e|viz|security|cve)\b/i.test(task);
  const hasLang = specialists.some((s) => ["go", "rust", "python", "swift", "typescript"].includes(s.agent));
  if (implementish && !hasLang) {
    for (const s of stackNorm) {
      const spec = langByStack[s];
      if (spec) add(spec);
    }
  }

  const loop = /\b(still|again|loop|broken|retry)\b/i.test(lower) || (specialists.some((s) => s.agent === "investigate") && specialists.some((s) => s.agent === "review"));

  return {
    entry: "superskill",
    defaults: DEFAULTS,
    specialists: specialists.slice(0, 4),
    loop,
  };
}
