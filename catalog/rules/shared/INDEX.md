# Shared Atomic Rules Index

Baseline: latest
Rules: 8 (verified: 8)

## data - Data integrity (2)

- [data-balanced-postings](data-balanced-postings.md) - Balance debit and credit postings within each currency
- [data-idempotency-payload](data-idempotency-payload.md) - Bind idempotency keys to the original operation parameters

## obs - Observability (2)

- [obs-allowlisted-diagnostics](obs-allowlisted-diagnostics.md) - Emit only approved diagnostic fields
- [obs-mandatory-audit](obs-mandatory-audit.md) - Preserve mandatory audit evidence when a protected operation commits

## sec - Security boundaries (3)

- [sec-filesystem-containment](sec-filesystem-containment.md) - Enforce physical containment at filesystem operations
- [sec-project-scope](sec-project-scope.md) - Bind every resource operation to its trusted project scope
- [sec-scan-before-truncation](sec-scan-before-truncation.md) - Check sensitive input before lossy output transformations

## test - Testing (1)

- [test-sensitive-output](test-sensitive-output.md) - Detect test leakage without echoing the captured data
