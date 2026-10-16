# Shared Rules - Sources

Baseline: latest
Last verified: 2026-10-16

## Primary

- [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) - trusted scope and object authorization.
- [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) - data minimization, verification and protection.
- [CWE-22](https://cwe.mitre.org/data/definitions/22.html) and [CWE-367](https://cwe.mitre.org/data/definitions/367.html) - containment and filesystem races.
- [Stripe Idempotency](https://docs.stripe.com/api/idempotent_requests) - parameter binding.
- [Modern Treasury multiple currencies](https://docs.moderntreasury.com/ledgers/docs/use-multiple-currencies) - currency-separated balance.
- [RBI IT directions](https://www.rbi.org.in/scripts/BS_ViewMasDirections.aspx?id=12562) - applicable audit requirements.
- [AWS transactional outbox](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) - same-transaction evidence, rollback and duplicate delivery.

## Independent verification

Verifier: fresh-context GPT-6 Astra subagent, 2026-10-16. All eight primary URLs above were fetched with `functions.webfetch` on this date. RBI section 15 supports applicable audit trails, detail and monitoring; AWS supports the atomic outbox mechanism. OWASP supports minimization and verification; the canary and truncation scenarios are concrete engineering deductions, not claims of prescribed OWASP scanner algorithms.

All eight controls passed adversarial text-scenario review after boundary corrections. Reviewed counterexamples: colliding project IDs and forged scope labels; sibling paths and parent replacement; nested error secrets and attacker-controlled approved-field values; URL-encoded canaries and assertion diffs; credentials crossing truncation boundaries and oversized input; changed retry parameters, independent namespaces and expired keys; cross-currency cancellation and split-posting imbalance; audit write failure, post-commit crash and duplicate delivery.

These are reviewed scenarios, not executed behavior. No compiler, runtime test, full build or validator was run for this review. Read-only catalog title search and inspection of the related TypeScript adapters and C++ logging rule found implementation overlap, not duplicate shared decisions: schema minimization, scan ordering, sink testing and audit durability have distinct failure conditions. Existing language adapters retain responsibility for their implementation claims and related links; this review does not verify lazy routing or language implementations.

Limits: trusted scope configuration and platform filesystem restrictions must hold at runtime; arbitrary encoded secrets are not universally detectable; audit durability depends on the actual storage boundary and delivery/retention requirements. Verified status is source-backed scenario review, not universal bank certification.

Local checks: `git diff --check -- catalog/rules/shared` exited successfully. A read-only `python3 -c` structural spot-check passed for eight controls: verified/review/shared metadata, one Bad and Good section, two text fences, summaries within 30 words, See Also presence, index membership/count, and absence of tool or compile-exemption claims. This spot-check is not the project's deterministic validator; its full invocation is recorded in the verifier session tool transcript.
