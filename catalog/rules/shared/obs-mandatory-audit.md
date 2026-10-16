---
id: shared-obs-mandatory-audit
lang: shared
prefix: obs
title: Preserve mandatory audit evidence when a protected operation commits
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [mandatory audit, audit durability, audit trail, protected mutation]
sources:
  - title: RBI IT Governance Risk Controls and Assurance Practices - Audit Trails
    url: https://www.rbi.org.in/scripts/BS_ViewMasDirections.aspx?id=12562
  - title: OWASP Logging Cheat Sheet - Verification and Protection
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  - title: AWS Prescriptive Guidance - Transactional outbox pattern
    url: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html
---
> Couple protected commits to durable mandatory audit evidence rather than a best-effort diagnostic append.

## Why

When an applicable requirement mandates audit trails, success without recoverable evidence is a control failure. Use a transactionally coupled audit record or, when deferred delivery is permitted, a durable outbox containing sufficient attributable evidence in the same commit boundary. Verify crash recovery, retry delivery and retention until durable audit handoff; an in-memory queue or an outbox pointer to mutable business data is insufficient. Protect attribution, access, retention and integrity without collecting secret payloads; this design implements the invariant but is not a claim that RBI mandates an outbox or certifies every implementation. Throwing after the business mutation commits does not undo it, and ordinary diagnostic logs are not automatically mandatory audit records.

## Bad

```text
Commit a protected mutation.
Attempt a mutable local audit append, swallow its failure, and return success.
```

## Good

```text
Establish that the operation requires mandatory audit evidence.
Commit the authorized mutation and durable audit/outbox state together.
Without durable evidence, do not admit the protected commit.
Audit-state write fails: both mutation and audit state roll back.
Crash after commit but before delivery: recover the committed evidence and retry.
Duplicate delivery retains one logical event; evidence survives until durable handoff.
Exercise storage failure, crash recovery, duplicate delivery and access controls.
```

## See Also

- [shared-obs-allowlisted-diagnostics](obs-allowlisted-diagnostics.md) - minimize fields without substituting diagnostics for audit evidence
