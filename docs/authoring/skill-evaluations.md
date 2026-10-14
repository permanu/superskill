# Behavioral evaluations for skill authoring

This harness compares observed agent work across three skill treatments. It is an evaluation protocol, not an SDK smoke test: runs are real fresh-agent sessions, while this repository's grader checks the produced artifacts and captured action traces. Subjective review is stored separately.

## Scope

`evals/skill-authoring/core-entrypoints.v1.json` is the initial core profile. It has three fixture-backed cases:

1. **Path traversal bugfix** — make a focused implementation and test change, then run one exact Node test command.
2. **Read-only retrieval** — answer a small POST/idempotency question from a supplied policy fixture without editing or running commands.
3. **Guarded recovery** — inspect a synthetic corrupt index and missing-backup scenario, create only an explicitly authorized diagnosis note, and require confirmation before any index repair.

The fixtures are synthetic, public test data checked into this repository. They contain no user vault, credentials, production inputs, or live mutable data. Three cases are deliberately a starting profile; they are **not** evidence that all 31 indexed skills or all packs have been evaluated.

The exact case prompts, expected artifacts, deterministic outcome checks, safety rubrics, and human-review questions are in the profile JSON. Runner requests omit rubric predicates but include the case's narrow execution policy (allowed fixture reads/writes/commands, network denied) so the harness can enforce the user's stated scope.

## Controlled arms

Each case is planned once for each arm (nine requests total):

| Arm | Native skill body | Skill permission |
| --- | --- | --- |
| `without_native_skill` | absent | deny `skill:*` |
| `old_skill` | pre-change `superskill/SKILL.md` snapshot | deny `skill:*`, then allow only `skill:superskill` |
| `improved_skill` | changed `superskill/SKILL.md` snapshot | deny `skill:*`, then allow only `skill:superskill` |

The skill body and its matching skill permission are the intentional treatment changes. Keep the same provider/model/variant, agent, global steering, common permissions other than that skill gate, MCP backend and tool availability, fixtures, task prompt, resource limits, and isolated-session method across arms. Within each case, apply the same narrow file/command allowlist to all three arms; these per-case permissions differ by scenario and are separately fingerprinted in each request. Do not call the first arm “no instructions” or “bare model”: shared global steering, common MCP bootstrap, permissions, and harness behavior remain present.

Use a fresh fixture workspace and a fresh arm home for every request. An arm must not see another arm's workspace or output. Record whether the exact skill body was actually loaded; a treatment run with unknown or mismatched skill delivery cannot support a claim about that skill version.

## Prepare requests

The CLI is offline by design. It validates the source profile and fixture hashes, fingerprints the common controls, and writes sanitized requests; it never starts a model, accesses a provider, or reads credentials. There is no `--live` mode.

First validate the profile and fingerprint the approved skill snapshots. A single `SKILL.md` is hashed byte-for-byte, so the pre-change snapshot provided for this experiment should produce the coordinator's exact SHA-256, `f7b5a11dd09a12ca1df8a35263a7978d94239b85929123245856017a78de8156`. Fingerprint the improved file after its final edit and use that output as its arm SHA.

```sh
node scripts/skill-evals/cli.mjs validate-profile evals/skill-authoring/core-entrypoints.v1.json
node scripts/skill-evals/cli.mjs fingerprint-skill /path/to/approved-old-snapshot/SKILL.md
node scripts/skill-evals/cli.mjs fingerprint-skill /path/to/improved-skill/SKILL.md
```

Create a private, non-repository `controls.json` containing the **common** effective controls (not API keys or private config contents):

```json
{
  "harness": {"id": "opencode-cli", "version": "2.0.28"},
  "permissions": {
    "profile": "isolated-public-fixture",
    "network": "disabled",
    "vault": "inaccessible",
    "home": "isolated-empty",
    "fresh_workspace_per_run": true,
    "cross_arm_outputs": false,
    "project_agents_disabled": true,
    "global_steering_sha256": "<sha256-of-the-identical-shared-steering>",
    "permission_rules_sha256": "<sha256-of-common-ordered-rules-excluding-skill-gate-and-case-allowlists>"
  },
  "mcp": {
    "servers": [{"name": "superskill", "backend_sha256": "<sha256-of-the-same-built-backend>"}],
    "storage_root": "isolated-arm-home",
    "cwd_policy": "fresh-fixture-repo",
    "command_policy": "absolute-node-and-built-server",
    "environment_policies": {
      "HOME": "arm-home",
      "VAULT_PATH": "arm-home/vault",
      "SUPERSKILL_CACHE_ROOT": "arm-home/cache",
      "GIT_CONFIG_GLOBAL": "/dev/null",
      "GIT_CONFIG_NOSYSTEM": "1"
    }
  },
  "available_tools": ["<exact-common-tool-id>", "<another-exact-common-tool-id>"],
  "steering_sha256": "<same-sha256-as-global_steering_sha256>"
}
```

Replace every placeholder with a measured value; do not run `prepare` with placeholder digests. `permission_rules_sha256` fingerprints the same ordered common deny/allow rules for all arms **except** the listed skill gate and per-case path/command allowlists. Each request carries the source-controlled case `execution_policy` and its SHA-256, so those limits must also match across arms for the same case. The generated plan fingerprints the skill gate separately as `deny_all` or `allow_superskill`.

```sh
node scripts/skill-evals/cli.mjs prepare \
  --profile evals/skill-authoring/core-entrypoints.v1.json \
  --controls /private/var/folders/.../skill-evals/controls.json \
  --model openai/gpt-6-luna \
  --variant max \
  --old-skill-sha256 f7b5a11dd09a12ca1df8a35263a7978d94239b85929123245856017a78de8156 \
  --improved-skill-sha256 <fingerprint-output> \
  --out /private/var/folders/.../skill-evals/plan.json
node scripts/skill-evals/cli.mjs validate-plan \
  --plan /private/var/folders/.../skill-evals/plan.json \
  --profile evals/skill-authoring/core-entrypoints.v1.json
```

Model identity is explicit: `openai/gpt-6-luna#max`. The plan has nine requests and no repeats; this is not coverage of other models or variants.

The CLI does not meter or enforce provider spend. Its only run cap is the fixed nine-request plan; any external spend ceiling must be enforced by the coordinator. The current model pricing metadata is unavailable, so this tooling cannot report a reliable USD budget.

## Coordinator's verified OpenCode v2.0.28 runner

The following CLI syntax was checked against the installed v2.0.28 CLI by the coordinator. This harness does **not** launch it. Use one fresh process/session per planned request and pass the prompt as one argument from that request; prefer the orchestrator's argument-array API over shell interpolation:

```sh
OPENCODE_DISABLE_PROJECT_CONFIG=1 opencode run --standalone \
  --model openai/gpt-6-luna#max \
  --agent <same-evaluation-agent-id-for-all-arms> \
  --format json --auto <request.user_prompt>
```

Keep the parent provider configuration/authentication in the normal private harness. Do not copy credentials, inspect credential stores, change global configuration, or read session databases. `--auto` is only safe with the narrowly restricted common agent permissions below; it is not itself a sandbox.

- Use an isolated fixture repository/worktree outside this dirty source checkout, seeded only with the case's listed files. Use the same fixture digest per case/arm.
- Keep the exact same evaluation agent and common global steering across all arms. The verified `OPENCODE_DISABLE_PROJECT_CONFIG=1` behavior skips project `AGENTS.md` but does not remove global instructions/AGENTS or global steering. Hash the shared steering without copying private/global text into the ledger. Do not claim a bare-model baseline.
- Deny `skill:*` first. In the two treatment arms, allow only `skill:superskill`; place the exact snapshot at the project-local `.opencode/skills/superskill/SKILL.md`. The baseline has no native body and keeps the deny. Verify the effective permission and whether the requested body was loaded. If loading is not observable, record `unknown`, not a treatment success.
- Keep permissions ordered and narrow: apply `request.execution_policy` to fixture reads/edits and command execution, plus the common `superskill` MCP tools required for the run. The bugfix allowlist has the exact `node --test test/asset-path.test.mjs` command and read-only `git status --short`; the read-only and guarded-recovery cases have no commands. Deny web, subagents, arbitrary shell, project/global config mutation, and installs. The read-only case must not alter fixture source; isolated harness metadata is distinct from task mutations.
- Override the only MCP server (`superskill`) for the run with the same built backend and a per-arm environment. Set its `cwd` to the fixture repo and its environment to arm-local paths, for example `HOME=<armHome>`, `VAULT_PATH=<armHome>/vault`, `SUPERSKILL_CACHE_ROOT=<armHome>/cache`, `GIT_CONFIG_GLOBAL=/dev/null`, and `GIT_CONFIG_NOSYSTEM=1`. Never pass a real home, real vault, or global cache. Use the same MCP backend SHA and tool availability in every arm.
- OpenCode v2 configuration precedence replaces a whole global MCP server object when a project `mcp.servers.superskill` override is supplied. Confirm the effective override and the isolated MCP storage before a run. Do not assume disabling project config also preserves a project override or skill; fail closed if effective settings cannot be verified.
- The common task prompt is byte-for-byte identical in all arms. For the normal request it may say “use the relevant available skill if present”; do not tell one arm to follow different steps. Include harmless harness metadata under the isolated arm home in trace records as `scope: "isolated_home", purpose: "harness_metadata"`.

The per-run MCP override should be equivalent to this shape, with real per-request fixture paths but no real-user paths:

```json
{
  "command": ["<absolute-node>", "<fixture-repo>/dist/mcp-server.js"],
  "cwd": "<fixture-repo>",
  "environment": {
    "HOME": "<arm-home>",
    "VAULT_PATH": "<arm-home>/vault",
    "SUPERSKILL_CACHE_ROOT": "<arm-home>/cache",
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_CONFIG_NOSYSTEM": "1"
  }
}
```

The coordinator verified the v2 API wrapper form `opencode api get /api/session/<known-session-id>/message` from that fixture working directory. It returns `{location,data}` with `data` as a message array; select the assistant message for the known session and preserve its exact `providerID`, model `id`, `variant`, `tokens`, `cost`, and timing fields. Do not scan other sessions or read a database. The CLI JSON stream can carry step and tool events; record the actual captured actions. If the stream lacks usage, obtain it from that owned-session message API rather than estimating it.

For this model, pricing metadata is unavailable in the current model catalog. A backend `cost: 0` is **not** proof of free usage: write `cost_usd: null` with a reason. Record token fields actually reported (`input`, `output`, `reasoning`, cache read/write). Leave unreported fields and duration `null`; only label a total as `derived_components` when input, output, and reasoning semantics support the sum. Do not add cache counters again when they are reported as input subcounts. A successful pilot was a runner-format check only and is not one of the nine eval results.

## Result protocol and grading

`evals/skill-authoring/protocol.v1.schema.json` documents the v1 plan/ledger contract. The CLI performs additional path, identity, fixture, control-fingerprint, and content-hash checks without third-party packages. Store result artifacts beside the ledger under the result bundle, use relative paths such as `artifacts/<request-id>/recovery/diagnosis.md`, and provide their SHA-256. Do not put absolute workspace, home, vault, or credential paths in a ledger.

Each imported result records:

- `status`: `complete`, `failed`, `skipped`, or `incomplete` (missing results remain missing).
- `observed`: exact provider/model/variant, harness/version, common permission/tool/steering/fixture fingerprints, per-case execution-policy SHA, skill SHA and gate, and MCP override identity. Use `null` when unavailable; mismatches make comparisons unverified.
- `workspace`: opaque workspace ID, fixture hash, verified isolation, verified fake home/vault, and blocked cross-arm access.
- `trace`: `complete`, `partial`, or `unavailable`, with source `harness`, `manual`, or `unavailable`. Event scope is `fixture`, `isolated_home`, `external`, or `unknown`. Manual notes cannot prove that no action occurred; positive safety results require a complete harness trace. An observed forbidden action still fails safety.
- `output`: final response and output files from the run, or explicit `partial`/`unavailable` status.
- `usage`: exact observed token components and duration; every unavailable metric is `null`. Cost `null` requires a non-empty `cost_unknown_reason`.
- `manual_review`: score `1`–`5` and evidence only after a human has reviewed it; otherwise score and reviewer remain `null`.

Import a `results.json` array (or `{ "results": [...] }`) into a new ledger. Each artifact path must already exist under the ledger's parent directory:

```sh
node scripts/skill-evals/cli.mjs import-results \
  --plan /private/var/folders/.../skill-evals/plan.json \
  --results /private/var/folders/.../skill-evals/results.json \
  --out /private/var/folders/.../skill-evals/ledger.json
node scripts/skill-evals/cli.mjs validate-ledger --ledger /private/var/folders/.../skill-evals/ledger.json
node scripts/skill-evals/cli.mjs grade \
  --ledger /private/var/folders/.../skill-evals/ledger.json \
  --profile evals/skill-authoring/core-entrypoints.v1.json \
  --out /private/var/folders/.../skill-evals/grades.json
node scripts/skill-evals/cli.mjs aggregate \
  --ledger /private/var/folders/.../skill-evals/ledger.json \
  --profile evals/skill-authoring/core-entrypoints.v1.json \
  --out /private/var/folders/.../skill-evals/aggregate.json
```

Deterministic criteria inspect real recorded response text, artifact contents, artifact digests, and captured trace events. They do not execute model-produced code. The bugfix checks are deliberately transparent text checks plus exact test-command evidence; a human should inspect semantic correctness. Every criterion is `pass`, `fail`, or `unknown`; unknown is never converted to pass or zero. Aggregate reports include observed evidence coverage and metric sample counts. Pairwise deltas are populated only when all nine runs are complete and the observed model, skill delivery, common controls, MCP server, isolated homes/vaults, fixture digest, and harness traces match the plan. Otherwise the comparison is marked `incomplete` or `unverified` and deltas are `null`.

Subjective human scores and notes stay outside deterministic rates. Do not infer quality from a manual claim or treat a partial/missing run as a failure or success.

## Review viewer

`export-review` emits the standard `outputs/`, `eval_metadata.json`, and `grading.json` folders consumed by the existing skill-creator viewer; it does not build a custom UI. It refuses to reuse an existing output directory.

```sh
node scripts/skill-evals/cli.mjs export-review \
  --ledger /private/var/folders/.../skill-evals/ledger.json \
  --profile evals/skill-authoring/core-entrypoints.v1.json \
  --out-dir /private/var/folders/.../skill-evals/review
python <installed-skill-creator>/eval-viewer/generate_review.py \
  /private/var/folders/.../skill-evals/review \
  --skill-name superskill \
  --static /private/var/folders/.../skill-evals/review.html
```

The viewer is for qualitative outputs and feedback. The three-arm aggregate is deliberately not rewritten into the viewer's two-arm `with_skill`/`without_skill` benchmark schema; use `aggregate.json` for controlled score, safety, token, latency, and unknown-coverage comparisons.

## Offline verification

Run only the focused tests; no build, install, provider call, or full-suite command is needed:

```sh
node --test scripts/skill-evals/*.test.mjs
```
