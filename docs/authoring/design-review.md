# Optional design review and host qualification

`review/design-spec` is author-side guidance for a requested independent design/spec review. It is not always loaded and is not a prerequisite for planning, coding, ordinary diff review, or completion. Its body is capped by a regression test at 2,600 characters (at most 748 estimated tokens with the repository estimator). It adds no MCP tools, runtime dependencies, agents, or default workflow steps.

Natural-language routing recognizes independent design review or direct requests to review a specification/design document. Merely referencing a specification during code/diff review does not activate this pack. Use `skill activate --skill-id review/design-spec --max-tokens 4000` for narrow activation without broad task-triggered rule selection. Existing budget and security checks still apply; omission is not successful delivery. On a same-version source checkout, refresh catalog metadata with `skill init`. Nothing here changes package-version refresh behavior.

## Prepare only the needed review

The author chooses comprehension (specification only), readiness/reuse (specification plus an explicit source/interface list and plan when needed), or both when justified. Do not bundle all project memory or every review checklist. Set finite input/output, duration and pass limits appropriate to the request before launch. One pass per selected lens and at most one targeted re-review; a cap never waives an unresolved finding.

Normal activation contains author-side system context and may contain other relevant packs. Do **not** forward its entire response to a blind reviewer. Supply the short design-review brief and only the selected inputs. The reviewer must not run the ordinary memory bootstrap or recursive skill activation. These are packet boundaries for the host, not an instruction to override higher-priority host policy.

## Required host observations

A supported host must expose the actual child identity, a terminal completion event, full input scope (including implicit bootstrap), and complete action capture. Verify all of the following before calling the review independent:

- Fresh conversation with no inherited parent messages, rationale, or other reviewers' answers.
- Actual effective system/project instructions and skill delivery, not only the requested configuration. Retain a digest of approved common steering, without copying private instructions into an evaluation report.
- Project/global memory excluded; tools cannot access another project, the author vault, network, writes, or unlisted source. A prompt saying “read-only” is not enforcement. The initial qualification path disables MCP entirely inside the reviewer.
- An isolated fixture workspace and home, denied cross-run access, and a controlled synthetic parent-only marker probe. Check bootstrap as well as tool reads; an empty tool trace does not establish an empty context.
- Full-byte hashes of every supplied specification, plan and source file. Compare against freshly computed expected hashes after completion. A same-HEAD dirty edit invalidates the match; the legacy parsed spec hash is unchanged and insufficient here.
- Actual final output and terminal completion from the same child. A launch result, incomplete stream, timeout, failed child, or self-reported success is not completion evidence.

Do not silently enable independence on a host just because its product name or version is recognized. If any boundary cannot be observed or enforced, return `isolation unverified` or `review unavailable`; an ordinary advisory review remains possible if the user wants it. A failed probe must not be bypassed by retrying until the marker disappears.

## Offline capture checks

The repository includes an offline evaluator, not a host launcher, runtime API, or persisted review-receipt system:

```sh
node scripts/skill-evals/design-review.mjs EXPECTED.json CAPTURE.json
node --test scripts/skill-evals/design-review.test.mjs
```

The expected object contains `request_id`, `steering_sha256`, `input_hashes` mapping fixture-relative paths to SHA-256 digests, and a fresh synthetic `parent_marker` (16–128 ASCII letters, digits, underscores or hyphens). Keep that marker in the parent/probe controller only, never in reviewer inputs or steering. Obtain expected values independently from the intended child, approved steering, and current exact input bytes. Do not derive them from the reviewer's report. A marker appearing in the output fails the probe; its absence alone does not prove isolation.

The capture reuses evaluation fields `request_id`, `status`, `execution_source`, `observed`, `workspace`, `trace`, and `output`. `observed` includes the effective `steering_sha256`, `project_agents_disabled`, and `mcp_server_names` (empty for this qualification). `workspace` contains `isolation`, `home_isolated`, `vault_isolated`, and `cross_arm_access`, using the existing evaluation vocabulary. `output.final_text` contains the actual final response. Trace events use the existing evaluation format; only successful reads of listed fixture paths are accepted. Command execution, even a shell read, is outside this strict qualification path.

The evaluation-only `context` capture records `source: "harness"`, `complete: true`, `fresh_conversation: true`, `parent_inherited: false`, `memory_enabled: false`, and the actually delivered `input_hashes`. Only a trusted host observer may populate those facts. Missing observation stays missing; a reviewer must never fill its own attestation. Input count is bounded to 64 and event count to 10,000; JSON inputs use the existing 10 MiB reader limit.

Results are `observed`, `unverified`, or `failed`. `observed` means the supplied capture is internally consistent with the requested boundaries. It is **not authentication of that capture**, proof of host isolation, a quality judgment, or gate evidence. Every result explicitly returns `independence: "not-attested"` and `gate_evidence: false`. Establish capture provenance and the live host probe separately. Synthetic passing captures test the checker only; they cannot qualify a host.

The checker reads the two specified capture files, makes no provider calls, writes no reports, and emits reason codes without reproducing input or reviewer text. It is not shipped as an MCP tool or injected during normal activation. No host is certified by these unit tests, and no production gate consumes these results.

Two fresh-context advisory exercises completed against synthetic specs during implementation. Comprehension found missing expiration, failure and acceptance semantics. Readiness found a rollback claim contradicted by the supplied source/test and an unspecified wrapper compatibility boundary. The latter did not treat the proposed new file as a missing current implementation. Both outputs explicitly reported isolation as unverified. These exercises permitted read-only shell inspection and lacked complete host/bootstrap captures, so they do not qualify this host under the strict checker. No quality score, token-cost improvement, or independent-review certification is claimed.

## Review and resolution

Require an input citation, consequence, supporting evidence and concrete fix/question for each finding. Resolve it as fixed, contested with inspectable evidence, deferred, or unresolved. Treat proposed files separately from broken current references. Do not suppress unknowns or interpret an empty finding list as comprehensive correctness. Review conclusions do not approve/freeze specifications or pass ticket evidence gates.
