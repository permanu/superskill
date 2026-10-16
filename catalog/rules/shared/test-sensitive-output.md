---
id: shared-test-sensitive-output
lang: shared
prefix: test
title: Detect test leakage without echoing the captured data
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [leakage test, test artifacts, secret output, snapshots, canary]
sources:
  - title: OWASP Logging Cheat Sheet - Verification
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
---
> Use synthetic canaries and payload-free assertions to check actual test and artifact sinks before upload.

## Why

A failed comparison can leak the captured value through the test runner's diff. Check success, error, timeout and cancellation outputs using booleans or fixed failure labels; inspect stdout, stderr, reports, snapshots and artifacts before publishing them. A canary test proves only the inspected values and sinks, so enumerate relevant encoded forms and do not substitute production credentials for fixtures. Unknown encodings, omitted sinks and output emitted before capture remain outside that evidence.

## Bad

```text
Check that captured output does not contain a credential.
On failure, print the entire captured output in an assertion diff.
Upload the report before scanning it.
```

## Good

```text
Inject a synthetic canary; capture the designated output and artifact sinks.
Canary A+B appears as A%2BB in a report: the URL-encoded case detects it.
If any tested representation appears, fail with SENSITIVE_OUTPUT_DETECTED.
The failure report includes no payload; blocked artifacts are not uploaded.
```

## See Also

- [shared-obs-allowlisted-diagnostics](obs-allowlisted-diagnostics.md) - restrict production diagnostic fields
