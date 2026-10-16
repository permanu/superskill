---
id: shared-obs-allowlisted-diagnostics
lang: shared
prefix: obs
title: Emit only approved diagnostic fields
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging, diagnostics, raw errors, sensitive data, redaction]
sources:
  - title: OWASP Logging Cheat Sheet - Data to exclude
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
---
> Emit an allowlisted event schema instead of serializing arbitrary errors or payloads.

## Why

Messages, stacks, causes, URLs and subprocess output can carry credentials or personal data. Static event identities, reviewed codes and purpose-limited opaque correlation IDs preserve diagnostics without copying arbitrary content into durable sinks. Exclude unapproved fields at every level, including debug; redaction is defense in depth rather than proof that unknown secrets are safe.

## Bad

```text
An operation throws an error containing a synthetic credential in its cause.
Serialize the whole exception to a production log or test report.
```

## Good

```text
Emit event=operation.failed and an approved outcome code.
Do not serialize the exception message, cause, request or environment.
Given cause.token=CANARY_DIAGNOSTIC_7, no sink contains that value.
An untrusted code or correlation ID containing that value is omitted or replaced.
Test nested errors, custom serialization hooks and subprocess failures at the sink.
```

## See Also

- [shared-test-sensitive-output](test-sensitive-output.md) - verify sinks without echoing captured values
- [shared-sec-scan-before-truncation](sec-scan-before-truncation.md) - inspect admitted content before lossy transformations
