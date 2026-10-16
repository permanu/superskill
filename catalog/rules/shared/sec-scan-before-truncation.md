---
id: shared-sec-scan-before-truncation
lang: shared
prefix: sec
title: Check sensitive input before lossy output transformations
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [secret scanner, evidence output, truncation, log truncation, redaction]
sources:
  - title: OWASP Logging Cheat Sheet - Event collection
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
---
> Apply sensitive-data controls before truncating or serializing diagnostic and evidence content.

## Why

Truncation can turn a recognizable credential into an undetected prefix, and serialization can hide the original key/value structure. Reject or sanitize the admitted complete input before lossy transformations, within explicit byte limits; oversized or uninspectable input must not fall back to unscanned persistence. Define supported encodings and inspection limits; a raw-text match does not establish detection after arbitrary encoding or custom serialization. Scanning still cannot identify every secret, so minimize collection and use allowlisted fields first.

## Bad

```text
Truncate a test error halfway through a synthetic credential.
Scan the fragment, fail to recognize it, and store the credential prefix.
```

## Good

```text
Enforce the admission limit, then inspect the full admitted input.
Fixture detector recognizes CANARY_SECRET_123; the output limit cuts after CANARY_SEC.
Inspecting the full fixture rejects it before that prefix can be persisted.
Reject detected credentials without storing a value or prefix.
Only then format/truncate safe evidence; report fixed failure metadata.
Input over the admission limit yields fixed metadata, never an unscanned prefix.
Test credentials that cross truncation and serialization boundaries.
```

## See Also

- [shared-obs-allowlisted-diagnostics](obs-allowlisted-diagnostics.md) - minimize collection before scanning
- [shared-test-sensitive-output](test-sensitive-output.md) - check the final designated sinks
