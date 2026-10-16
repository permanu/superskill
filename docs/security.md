# Security

- **Vault jail** — paths are rewritten under `projects/<slug>/`; traversal and symlink escapes are rejected; sibling projects are denied. `VAULT_PATH` is bounded to the home directory.
- **Data-only metadata** — Markdown frontmatter accepts YAML and JSON objects, never executable engines. Metadata parsing has a byte budget, and production loaders share the same parser boundary.
- **Secret scanner** — `write` blocks secret-like content with `SECRET_REJECTED` before anything is stored, covering common provider keys (OpenAI, Anthropic, Google, AWS secret access keys), webhooks, and generic tokens. Vault mutations are recorded in a local audit trail (`~/.superskill/audit/vault-writes.jsonl`, path/op/bytes only — never content).
- **Audit gate** — explicit audit failures always block installation, including with `--allow-unaudited`. Unknown and warn-only audits require that flag; non-all-pass installs are marked `.unaudited-superskill`. Installs preserve the selected bundle from one resolved Git commit and record file hashes separately in `.superskill-provenance.json`. skills.sh audits are not commit-bound, so even all-pass results are recorded as unversioned repository audits, not attestations of the installed revision. At activation, explicit failures block loading; unknown/warn audits remain visible without blocking local/native skills.
- **Prompt-injection scan** — skill content is scanned before injection for override, exfiltration, secrecy, and destructive-command patterns; hard blocks are dropped with a warning. Installs scan bounded UTF-8 support files, including scripts, without executing them. Bounded non-executable PNG, JPEG, GIF, WebP, and PDF assets require matching signatures and extensions; their hashes are recorded, but they are not prompt-scanned or certified malware-free. Unsupported binaries, native executables, archives, unsafe links, and malformed assets are refused rather than silently omitted.
- **MCP rate limit** — write tools are limited to 30 operations per minute per server.
- **Diagnostic boundaries** — MCP exception handling and VaultFS diagnostics emit static events and allowlisted error codes, not raw errors, stacks, causes or subprocess output. Public MCP exception messages use fixed text. Other CLI/library paths have not all migrated; this is not a repository-wide non-disclosure guarantee.
- **Skill trust boundary** — activation and direct skill/support-file inspection use the same assessment. Non-catalog bundles receive bounded whole-directory scanning and recorded file-hash checks; changed, missing, extra, unsafe or unscannable files block loading. Local manifests are not attestations. Optional host-owned pins bind an approved bundle digest outside the mutable skill directory; pin-required mode rejects unapproved non-catalog content. Bundled catalog skills receive selected-content scanning and are identified as bundled, not externally audited; their integrity depends on the package installation boundary. New catalog graph entries no longer fabricate passing external audits.
- **Host tool policy** — an optional host-owned MCP tool allowlist is enforced before handlers and at indirect resource/prompt boundaries. It does not sandbox standalone CLI or other agent tools; OS permissions and network egress remain deployment responsibilities.
- **Evidence ingestion** — supplied evidence commands and full test output are secret-scanned before output truncation. Findings contain type/line metadata and a fixed redaction marker, never source snippets. Detection includes quoted credential fields, credential-bearing URLs and Basic authentication in addition to provider shapes.

## Default agent policy

Successful skill activation reserves the compact comment/logging policy ahead of optional brief, orchestration, principles and rules, including at the 256-token minimum. This delivery guarantee applies to the activation response, not to a host that never calls it or a model that ignores it. Detailed `pipeline/comment-discipline`, `security/logging` and `security/banking` packs are prioritized over language rules when routed; a budget can still omit a detailed pack and reports that omission.

Running MCP processes must restart on the updated build. Published version changes refresh the indexed catalog automatically; same-version development checkouts with an existing graph need catalog reinitialization to discover newly added packs.

Prefer readable code over narration. Keep non-obvious rationale, invariants and edge cases; use TODO/FIXME/BUG/HACK/REFACTOR with tracked completion/removal conditions, rare INFO, and ERROR only for a non-obvious failure contract. Preserve licenses, tooling syntax, necessary public API contracts and safety explanations. Semantic comment quality is reviewed rather than claimed to be regex-enforced.

Production guidance requires allowlisted event schemas, data minimization, synthetic test data, boolean leakage assertions and inspection of failing output, snapshots, traces and artifacts before upload. Passing a scanner is not authorization to persist customer data.

## Trust boundaries

The project jail applies to the connected agent, not just to filenames supplied to `read`. Search, graph traversal, resources, and generated notes must keep the selected project scope. Register an unmapped workspace before accessing implicit project memory. Supported explicit-project reads select their own jail; workspace-derived tools must not mix one checkout's code into another project's memory.

The vault and local state contain private information. Keep them outside repositories and review any Obsidian sync, backup, or sharing configuration separately. A local-only feature can still disclose content when its result is returned through MCP to the connected model. Watchdog transcript excerpts require explicit opt-in; see [Watchdog](watchdog.md).

SuperSkill does not upload telemetry. Explicit skill installation contacts skills.sh and GitHub; Java snippet compilation can download pinned Maven artifacts; package installation and latest-version launchers use their package registries. Native diagnostics can contact user-configured services, such as a remote Docker daemon. These operations are separate from local knowledge search. The connected host's model and data-retention policy are outside SuperSkill's control.

Secret detection and prompt-injection scanning are defense-in-depth heuristics, not proofs that content is safe. They cannot recognize every credential, personal detail, or instruction attack. Review the source and permissions of installed skills, including support scripts, before allowing an agent to execute them. A passing third-party audit is not execution authorization.

Native skill-profile validation checks metadata and bundle constraints, not whether a model follows the skill effectively. Anthropic recommends evaluating with the exact models and workflows intended for use; do not treat green unit/fixture checks as model-quality evidence. A `portable` profile does not guarantee offline operation or compatibility with every host: skills that require Node, MCP tools, packages, or network services depend on those capabilities. Anthropic documents that Claude API code execution has no network access or runtime package installation; see its [skill-authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

## Filesystem and recovery limits

New private state uses restrictive file permissions; note updates preserve existing file permissions. Writes use ownership-checked locks and atomic replacement. Recovery must distinguish corrupt data from an I/O failure: a permission or disk error is not permission to replace existing state with an empty file. Generated content must not overwrite hand edits or remove a file solely because its name resembles a legacy artifact.

Symlink checks reduce accidental and repository-controlled path escapes. Portable Node filesystem APIs do not provide a complete sandbox against a hostile local process racing to replace parent directories. Do not share a writable vault or checkout with untrusted local users. File locks coordinate processes on a filesystem with atomic exclusive creation; file-sync services do not provide a distributed lock service.

Cleanup reports and dry runs are not authorization to delete files. Use explicit apply/confirmation controls, preserve recovery manifests, and keep uncertain worktrees or caches. No cleanup should rely solely on a live-looking PID from another machine, a reusable path, or a cache-name prefix.

## Verification

`npm run build` followed by `npm test` exercises the built MCP boundary as well as library tests. `npm audit`, `npm run check:versions`, and `npm run verify:grammars` check dependencies, release metadata, and vendored parser integrity. The package-boundary regression test checks that local memory, traces, tests, and source maps do not enter the npm artifact. These checks cover known cases; a passing suite is not a guarantee of zero vulnerabilities.

## Remaining upstream advisory

As of 2026-10-16, the lockfile audit has no high or critical findings. [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) remains as four moderate dependency entries along `gray-matter → js-yaml → argparse → sprintf-js`; npm audit proposes an incompatible gray-matter downgrade rather than a patched sprintf release. YAML parsing and serialization do not import argparse or sprintf, the application does not invoke the YAML CLI, and executable frontmatter is blocked at the shared parser boundary. The advisory remains visible rather than suppressed or hidden by an incompatible downgrade. CI and release verification reject high/critical advisories with `npm audit --audit-level=high`.

## Banking readiness assessment — 2026-10-16

**Not established for regulated production use.** SuperSkill is local developer tooling, not a ledger, payment processor or multi-user banking service. The banking pack adds financial-software review obligations; it does not implement or certify those applications. This assessment combines source inspection, targeted regressions, the repository suite and primary regulatory-source checks. It is not an exhaustive penetration test, independent assurance or institutional compliance assessment.

### Findings and disposition

| Priority | Evidence | Finding and disposition |
| --- | --- | --- |
| High, fixed at named boundaries | `src/mcp-server.ts`, `src/lib/vault-fs.ts`, `src/lib/safe-diagnostics.ts` | Raw exception diagnostics could expose arbitrary values, including error causes and child-process output. Replaced with static event/code records; MCP public exception messages no longer echo supplied paths/values. Canary and hostile-getter tests exercise the sinks. |
| High, fixed for covered shapes | `src/lib/secret-scanner.ts`, `src/commands/evidence.ts` | Quoted credential fields escaped detection; diagnostic snippets retained neighboring data; truncation could store a credential prefix. Added structured/URL/Basic detection, eliminated snippets and scan full evidence before truncation. Unknown/encoded secrets and PII remain outside any complete scanner guarantee. |
| High, open rollout blocker | `src/cli.ts` catch handlers; `src/commands/skill/activate.ts` catch; `src/lib/skill-installer.ts` clone failure | Legacy diagnostics and returned command-result error strings still expose arbitrary error text. Migrate producers to typed errors/static event codes and run canaries against CLI, tool-result, installer, setup and subprocess paths before bank deployment. Fixed top-level exception handling cannot sanitize earlier logs or successful error-shaped results. |
| High for mandatory audit use, open | `src/lib/vault-fs.ts` `appendVaultWriteAudit` | Local audit recording is best-effort, mutable, rotated and not transactional with the mutation. It records paths, which may themselves be sensitive. A bank deployment needs a classified event schema, attribution, protected collection/retention and an explicitly tested durable/fail-closed audit strategy. Simply throwing after a successful mutation would not make the operation atomic. |
| High for sensitive prompts, open | `src/lib/graph/learner.ts` `startSession`; activation `findOrCreateSession` call | Task intent is retained in the local graph and can be included in subsequent context. Opt-in hashed telemetry does not make graph memory anonymous. Define data minimization, consent, retention/deletion and egress controls across graph, vault, host transcripts and backups. |
| Medium, fixed for compact floor | `src/commands/skill/activate.ts` | Rules could consume the budget before required guidance. Reserved a small policy first and prioritized the three new detailed policy packs. Minimum-budget tests cover all phases; larger-budget tests require actual banking/logging content, not merely orchestration labels. |
| Medium, open | `vitest.config.ts`; `.github/workflows/ci.yml` | Entry/setup/rule-planning exclusions mean headline coverage is incomplete. CI tests Linux/Node 22 and 24; this local verification uses macOS/Node 26. Integration tests exist, but bank rollout needs explicit supported-platform and failure-mode evidence, not an aggregate percentage. |
| Medium, tracked upstream | Lockfile audit | Four moderate dependency entries remain; no high/critical findings. Do not apply an incompatible downgrade automatically. |
| Deployment evidence missing | `src/mcp-server.ts` stdio transport; `src/app-context.ts`; `docs/security.md` trust boundaries | OS identity/project scoping is not per-user bank RBAC/MFA. Host/model/vendor egress, encryption/KMS, SIEM, retention, branch protections, release approvals, SBOM/provenance and recovery objectives require deployment evidence. Some may be supplied externally; absence of repository code alone is not proof they do not exist. |

### Review coverage

Verification on the working changes based on `deb3974d61507179604cfc114c8d6811e1482caa`:

- `npm run test:coverage`: 221 files, 3,928 tests passed; statements 89.86%, branches 83.13%, functions 95.20%, lines 93.21%. Existing exclusions remain in force.
- After narrowing Basic-auth detection to an Authorization field to avoid rejecting ordinary prose: fresh `npm run build` and 205 scanner/caller/MCP boundary tests passed. The complete coverage run preceded that final regex refinement.
- `npm run lint`: passed. Script/skill-evaluation fixture suite: 44 passed; these are deterministic fixtures, not live model benchmarks.
- Rule schema validation: 2,245 clean, zero errors, 18 existing compile-exemption warnings. Native skill, package-boundary, grammar-integrity and version-parity checks passed.
- Full TypeScript strict snippet validation timed out after 120 seconds. Direct compiled `validateFile` checks for the three edited TypeScript rules passed all six Bad/Good snippets with tsc 5.9.3, zero issues and no skips; the full language matrix was not rerun.
- Lockfile audit: zero high/critical, four moderate entries as documented above. No dependency downgrade, advisory suppression, release or publication performed.

| Review axis | Inspection/evidence and remaining limits |
| --- | --- |
| Intent | Both internal bank tooling and financial application guidance covered; no institutional certification claim. |
| Callers/blast radius | Activation CLI/MCP registry paths, evidence ingestion, scanner consumers, MCP tools/resources/prompts and VaultFS diagnostics considered; legacy sink migration remains open. |
| Algorithmic correctness | Evidence scan-before-truncate and fixed diagnostic shapes tested; secret recognition remains heuristic. |
| Concurrency | Existing VaultFS cross-process tests retained; added logger import to the worker fixture. Shared audit rotation/append durability needs separate assurance. |
| Errors/rollback | MCP error codes preserved with safe public text; audit loss remains best-effort. |
| Trust/tenancy | Existing project scoping, parser restrictions and boundary tests provide defense; shared-service identity/authorization is not supplied by a local jail. |
| Secrets/privacy | New synthetic-canary tests cover errors and evidence. Remaining diagnostic producers, graph task memory and external host retention block a universal leakage claim. |
| Injection/parsers | Data-only frontmatter, bounded reads, skill source validation and heuristic prompt scanning inspected; adversarial model behavior is not proven safe by regex. |
| API/contract | Public error codes retained; message wording intentionally changes. Static diagnostics intentionally omit previously exposed context. |
| Persistence/migrations | No schema migration. Graph atomic rename is present; power-loss and backup restoration guarantees need deployment-level fault testing. |
| Resource lifecycle | Skill network timeout/stream limits and worktree ownership mechanisms inspected; full stress/soak testing not performed. |
| Time/order | Existing lock/session tests retained; banking pack requires settlement, replay, cutoff and timezone tests in consuming applications. |
| Supply chain | Pinned actions, grammar integrity, package checks and dependency audit reviewed; remote branch controls and signing attestations not inspected. |
| Observability | Static event/code logging at governed boundaries; full operational correlation, audit loss alerting and SIEM evidence remain missing. |
| Tests/evidence | Synthetic regression failures reproduced before fixes; full suite and catalog checks are required gates. Model-quality benchmarking and independent pentesting remain unperformed. |
| Operability | Restore/incident ownership, retention, RTO/RPO and deployment approvals need external evidence and exercises. |
| UI/accessibility | Not applicable to this CLI/MCP change; banking application UI must be assessed in its own repository. |
| Architecture | Reused activation budgeting, scanner and catalog; added a small allowlisted diagnostic module rather than a global console monkey patch. |

### Jurisdiction applicability

The [banking pack](../catalog/security/banking.md) links primary sources checked on the assessment date: RBI IT governance for applicable Indian regulated entities; EU DORA/GDPR scope; US regulator/FFIEC/GLBA scope; Canada's OSFI B-13/B-10 and privacy requirements; Australia's CPS 234 and revised CPS 230; UK PRA/FCA resilience/outsourcing and UK GDPR scope. Confirm the entity, service criticality, country operations and effective version before mapping any obligation. In particular, publication of the March 2026 SS2/21 revision does not make its March 2027 commencement immediate.

For financial applications, require independent evidence for exact money arithmetic, ledger balancing, idempotency/replay, reconciliation, maker-checker authorization, fraud/AML/KYC where applicable and recovery under partial failure. Those are guidance here, not features or tests of a payment engine in this repository.

## Atomic coverage and lazy routing follow-up

The initial inventory contained 2,245 atomic rules: C 265, C++ 326, Go 264, Java 303, Python 287, Rust 262, Swift 279 and TypeScript 259. An inventory by title/trigger plus targeted source review found existing monetary representation, retry, path-security and logging rules, but the high-level banking pack did not supply separate decisions for project scoping, safe leakage assertions, idempotency payload binding or currency-separated ledger balancing.

The follow-up adds eight shared controls, available to all eight languages, and four TypeScript implementation adapters: 2,257 rules total, including TypeScript 263 and shared 8. The controls live once under `catalog/rules/shared/`; language adapters reference them through `related`, and matching references expand only one hop under the same budget. Shared controls still require a relevant task/file match or a matching adapter; neither a language nor bank context bulk-loads them.

The four TypeScript adapters passed independent source/duplicate review, eight snippet compilations and 47 behavioral assertions. The eight shared controls passed independent primary-source and adversarial text-scenario review, not compilation. Verification evidence is recorded in `catalog/rules/shared/sources.md`; checks were performed on 2026-10-16. Tests exercise shared routing and activation in every supported language, not just TypeScript.

| Control area | Coverage after follow-up | Remaining gap |
| --- | --- | --- |
| Trusted project/vault lookup scope | `shared-sec-project-scope` plus TypeScript adapter | Runtime authorization and language/API-specific evidence remain necessary. |
| Filesystem containment | `shared-sec-filesystem-containment`, referenced by C/C++/Java/Python adapters | Platform-specific descriptor and parent-race limitations. |
| Test-output leakage | `shared-test-sensitive-output` plus TypeScript adapter | Adversarial encoded/derived-data cases; no universal PII detector. |
| Scan-before-truncation | `shared-sec-scan-before-truncation` | Input-size bounds and detection limits at each real sink. |
| Idempotency request binding | `shared-data-idempotency-payload` plus TypeScript adapter | Durable/concurrent reservation, result/effect atomicity, key expiry and recovery need separate rules and proofs. |
| Per-currency balanced postings | `shared-data-balanced-postings` plus TypeScript adapter | Atomic persistence, reversals, reconciliation and settlement ordering. |
| Money representation | Existing Java BigDecimal, Python Decimal, Swift Decimal and TypeScript minor-unit rules | Cross-language semantic parity and currency/exponent policies are not established. |
| Logging/privacy | `shared-obs-allowlisted-diagnostics`, linked from Go/Rust/Swift/TypeScript adapters, plus logging pack | Several legacy examples recommend raw exception logging; a complete cross-language contradiction review remains open. |
| Mandatory audit | `shared-obs-mandatory-audit` | Actual transactional storage, recovery, integrity and delivery evidence. |
| Banking operations | High-level banking pack | Additional atomic controls for maker-checker, privileged access, key lifecycle, recovery and jurisdiction-specific operational evidence. |

This is a coverage inventory, not a claim that all atomic gaps are filled. The updated authoring contract separates common invariants from implementation-specific examples; neither copied prose nor shared scenario review proves every language implementation correct. All eight catalogs can reference shared controls without duplicating their content.

Banking methodology now uses the current project's explicit context frontmatter or an explicit banking task. General-purpose projects remain unclassified by default, and incidental context-body mentions do not change that. Graph resolution returns matching metadata without loading the pack body. See [configuration](configuration.md#lazy-project-domain-routing) for the scoped metadata format and limits. The compact universal policy retains the jailed-vault requirement and contains no banking-specific instruction.

Follow-up verification: `npm run test:coverage` passed 224 files / 4,007 tests, with 93.26% line and 83.24% branch coverage under the existing coverage exclusions. Build and lint passed; all 2,257 rule schemas validated with zero errors and 18 pre-existing compilation-exemption warnings. The shared-pack strict schema check passed eight controls with zero warnings; this is scenario-contract validation, not compilation. Package validation passed 2,607 paths, native-skill validation passed, 44 script/fixture tests passed, and `git diff --check` passed. The full eight-language snippet compilation matrix was not rerun because the non-TypeScript adapter edits only add references; shared controls are independently reviewed text scenarios.

## Priority hardening follow-up

### Delivery and trust

Activation now reports `delivered`, `partial`, `missing`, `blocked`, `fallback` or `error`, plus per-skill delivery records. A selected/requested set with zero delivered skills is unsuccessful; MCP marks it as a tool error. Partial results may still contain useful delivered guidance and explicitly identify omissions. Baseline-only fallback can succeed but does not claim specialist coverage. Missing planned specialists are disclosed, with verified rules and primary documentation as the fallback; replacement skills are never silently downloaded. Compact results cap delivery records and report their total count and truncation.

Every delivered skill carries origin, integrity, heuristic scan status, `attestation: not-established` and `execution: not-authorized`. Local manifest matching detects drift, not publisher identity. The host pin hashes the path-sorted bundle file records (path, sizeBytes, sha256, kind), excluding installer-generated sidecars; whole-bundle matching prevents extra support files from escaping the recorded inventory. Filesystem races after inspection and future script execution remain outside this snapshot guarantee. Bundled package integrity depends on the trusted installation/release boundary.

Direct graph inspection no longer bypasses skill trust checks: unsafe skill content and support files are refused, including attacks in a support file when opening the main skill. Scanner normalization covers the reproduced spacing/Unicode variants and the tested authority-escalation wording. This does not make a regex scanner semantically complete. There is no unsafe-open switch; use a separate constrained audit environment to investigate a refused bundle.

### Guidance and comment cleanup

Sixteen principles lacking source metadata were moved to draft rather than retaining unsupported `verified` labels. The principle loader and graph index downgrade future unsourced verification claims; default activation excludes drafts. Nine contradictory or redundant atomic examples are also draft-only pending revision: seven C++ raw-exception examples, Java SQL exception-chain reporting and redundant TypeScript parameter tags. Their concepts remain available for explicit review; they are not silently treated as verified production recommendations.

The Python exception-logging rule, Java Throwable-logging rule and TypeScript public-JSDoc rule were revised and independently reverified. All six Bad/Good snippets compiled with available toolchains; synthetic Python/Java failure cases distinguished raw exception leakage from fixed-code logging. Public API documentation now records non-obvious contracts instead of requiring narration on every export. A catalog quality gate checks valid source metadata and the known conflicting raw-exception/blanket-documentation patterns; it is not an exhaustive semantic proof.

The source cleanup removed 70 decorative/numbered comments across six production files, plus redundant installer flow blocks and narration. Before/after comment-stripped TypeScript transpilation produced identical JavaScript hashes for all six files during that cleanup step. Subsequent functional hardening is verified separately. Licenses, tooling directives, API contracts and non-obvious safety rationale were preserved; this was not a blanket deletion of every comment or an assertion that every remaining comment is optimal.

Host sandbox configuration, release signing/attestation, legacy diagnostics outside the hardened paths, graph task retention and mandatory audit durability still need deployment or follow-up work. The available tool/pin policies must be configured by the trusted host to take effect; this change does not silently reconfigure the user's machine or claim universal bank readiness.

Priority-follow-up verification: fresh build and full coverage passed 227 files / 4,033 tests (lines 93.28%, branches 83.39%, statements 89.96%, functions 95.21%). Lint, 44 script/fixture tests, 2,257 rule schemas, native skill validation, nine grammar assets, version parity and package validation (2,609 paths) passed. Rule-schema validation retains 18 pre-existing compile-exemption warnings. Three revised rules independently passed six snippet compilations and the Python/Java synthetic leakage checks. No live model adversarial benchmark, OS/network sandbox deployment or whole-language compilation matrix was claimed.

## Remaining-control implementation

The earlier draft backlog is now closed. All 16 held principles were independently sourced and reviewed, with unsupported absolutes narrowed; all 25 principles now have source metadata and verified status. The nine held language rules were repaired, independently reviewed and passed all 18 Bad/Good snippet compilations with zero skips. Behavioral checks cover slicing, real I/O failure, fixed diagnostics, bounded nested/SQL chains, termination and buffer aliasing. The catalog contains 2,257 verified atomic rules and no remaining draft rules. These claims concern source/example verification, not automatic correctness of model-generated applications.

Automatic routing no longer retains or echoes plaintext task intents by default. Process-keyed opaque labels preserve in-process deduplication without a persistent dictionary-testable digest key. The next activation minimizes legacy intents in the active graph. `SUPERSKILL_RETAIN_TASK_TEXT=1` is explicit opt-in and rejects detected credentials; invalid settings fail closed. User-authored notes, explicit session records and old external backups are separate retention surfaces and are not silently deleted.

The [restricted runtime](restricted-runtime.md) implements actual OS-level container boundaries and a host-side audit supervisor. Project/vault data are read-only; only bounded private tmpfs metadata is writable, network egress is disabled, capabilities are dropped and unapproved tools/skills are refused. Arbitrary child diagnostics are withheld. Its external metadata-only journal is fsynced before forwarding requests and responses; journal errors stop forwarding. Protected vault mutations are unavailable in this profile, so the native best-effort write log is not represented as a transactional audit mechanism. General-purpose local mode remains available with its documented weaker deployment boundary.

CI and release workflows now include the container build and real kernel/MCP isolation smoke test. Full repository verification passed 4,037 tests across 228 files (93.27% lines, 83.38% branches); rule-schema validation passed all 2,257 rules with the 18 pre-existing compile exemptions. A further cross-language comment review repaired blanket C, C++ and Swift comment requirements: all six snippets compiled and Swift retention behavior was exercised. Project-required public documentation is preserved without universal boilerplate.

The live Linux-container smoke test passed all eight kernel checks: non-root execution, read-only root/workspace/vault, denied external network, zero effective capabilities, no-new-privileges and bounded PIDs. A real MCP client verified retrieval/routing, denied writes/installations/cross-project access, blocked unapproved native skills and no persisted host routing state. Replacing the host audit file stopped subsequent requests; the journal and captured diagnostics omitted the synthetic private-context marker. No test containers remained afterward. These are results for the documented restricted profile, not a claim about arbitrary host configurations or unknown vulnerabilities.
