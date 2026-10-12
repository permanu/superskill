---
id: typescript-original-name
lang: typescript
prefix: err
title: Mismatched id fixture
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [mismatch]
sources:
  - title: Example source
    url: https://example.com/mismatch
---
> Fixture body resolved through the parsed rule index.

## Why

The file name does not match the frontmatter id, so path-derived lookup misses.
