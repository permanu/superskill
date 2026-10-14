# Skill-authoring remediation — 2026-10-14

The Anthropic best-practices audit fixes were implemented locally with 16 distinct GPT-6 Luna Max worker/reviewer sessions. Existing changes were preserved. At this remediation checkpoint, changes were uncommitted and no repository publication or global MCP configuration change had been requested or performed; subsequent release preparation is a separately authorized step.

## Corrected boundaries

- Skill delivery preserves complete fenced content instead of inserting elisions. Native, catalog, and cached sources share a bounded resolver; cached links must retain the requested owner/repository/skill identity.
- Installation preserves original discovery metadata and supporting files from one resolved Git commit. Separate provenance records hashes and explicitly identifies skills.sh audits as unversioned, not revision-specific attestations. Explicit audit failures cannot be bypassed.
- Scanned UTF-8 scripts are copied without execution. Bounded PNG, JPEG, GIF, WebP, and PDF data assets require matching signatures/extensions; unsupported or executable binaries, archives, and unsafe links fail closed.
- Native validation is separate from internal pack/rule contracts. The real CLI/MCP command checks metadata, required references, local containment, and concision/navigation guidance. Nearby unrelated optional prose and absolute drive, UNC, or file-URI references cannot waive required-resource checks.
- Principles, constitution, and skill resources have deterministic graph targets. UTF-8 byte cursors and transport-aware pages make long text reconstructable without gaps or partial instructions presented as complete.
- Setup and doctor distinguish launcher ownership from automatic upgrade permission. Explicit pins/custom launchers remain intentional configurations; only supported unversioned legacy launchers receive upgrade guidance.
- Generic UI/browser QA no longer invokes graph-note mutation. Optional methodology is task-scoped; a README typo baseline drops from 2,358 to 683 estimated content tokens, not measured provider tokens.
- Native and managed instructions describe actual host tool names, dependencies, authorization, bookkeeping, recovery archives, and continuation handling. Prior managed instruction variants remain migratable without overwriting custom text.
- Telemetry/watchdog distinguish unavailable evidence from empty data. Required validation gates reject missing or zero-checked inputs.

## Repository verification

| Gate | Observed result |
| --- | --- |
| Fresh build and typecheck | Pass |
| `npm run test:coverage -- --reporter=dot --silent` | 3,905 tests / 218 files; unchanged coverage thresholds |
| Coverage | 93.19% lines; 83.08% branches; 95.19% functions; 89.84% statements |
| Node script/evaluation protocol tests | 43 passed; no provider calls in these tests |
| Shipped native skill gate | One skill passes the Anthropic profile |
| Atomic rule structural gate | 2,245 checked; zero errors; 18 documented compile exemptions |
| Vendored grammars | Nine source-pinned assets verified |
| npm package boundary | 2,586 paths; no forbidden development artifacts |
| Version parity and `git diff --check` | Pass |
| Dependency audit | Zero high/critical findings; four moderate entries from the known upstream sprintf-js advisory |

The rule gate above used `--no-compile`: it is structural evidence, not a fresh eight-language snippet-compilation run. Software gates do not establish skill efficacy, natural triggering accuracy, or cross-model quality. The independent built-MCP regressions exercise actual lossless activation, native validation, principle/constitution opening, and reconstruction of a long Unicode reference through capped pages.

## Behavioral protocol and attempted evidence

The checked-in [core profile](../../../evals/skill-authoring/core-entrypoints.v1.json) defines a path-traversal patch, a read-only retry-policy question, and a bounded recovery diagnosis. The [protocol CLI](../../../scripts/skill-evals/cli.mjs) prepares and validates three treatments: no native skill, the pre-change source, and the improved source. Ordinary CI validates this protocol without calling a provider.

Nine headless attempts requested `openai/gpt-6-luna#max` through OpenCode 2.0.28. Fixture files, common steering, case-specific permissions, and a frozen MCP engine were held constant. Fixtures used opaque separate workspace paths and isolated MCP homes/vaults/cache, with a common guard blocking other project/workspace arguments. Resolved permission preflights were performed serially after concurrent diagnostic lookups proved unreliable. The native skill was conditionally prompted for consultation; this was not a natural-triggering test. Host provider authentication remained in the existing host runtime, not copied into fixtures; tool permissions are not an OS sandbox.

Every attempt reached its 600-second deadline without a verifiable session ID, model identity, skill-body delivery, usage, action trace, or generated output. Input fixtures remained byte-identical. Normalized results therefore retain unavailable output/trace/usage and unknown delivery, not zero events or fabricated passes. The validated ledger contains nine attempts, all nine grades are **incomplete**, all 51 expectations are **unknown**, and `controlled_comparison` is **false**. Timeout intervals are not skill latency measurements. A separate no-tools connectivity pilot previously confirmed the requested Luna Max identity, but it is not scenario or skill-efficacy evidence.

The ledger, raw attempt diagnostics, and static skill-creator review viewer remain in the approved temporary evaluation workspace rather than in the package or public repository. No quality gain, cost saving, or tested-model matrix is claimed. Resume real behavioral comparisons only after the headless adapter supplies verifiable session evidence; all 31 internal packs remain outside this initial three-case efficacy profile.

The host retained nine evaluation-specific MCP wrapper/engine pairs after the attempts. Teardown matched only their exact owned temporary script paths, sent the wrappers `SIGTERM`, and verified zero remaining fixture helpers. The host's global service was not stopped or restarted, and no files or evaluation evidence were deleted.

Source skill SHA-256: `346f9fe0ea5a6f96a66af1237f124be5ae82131fc49890d377ffdf99fc524402`. Pre-change source snapshot SHA-256: `f7b5a11dd09a12ca1df8a35263a7978d94239b85929123245856017a78de8156`.

## Deployment boundary

The installed shared skill was inspected and backed up, but left unchanged: its SHA-256 remains `4ecaa97eeeb490eeb8c9895821ac5793be7e384c76d960d67a2366313c032463`. Source/migration fixes and their regression tests do not deploy the new MCP backend to existing clients. Shared-skill synchronization, host configuration, and running-server replacement require a separately scoped deployment approval; no forced restart or launcher override was performed.
