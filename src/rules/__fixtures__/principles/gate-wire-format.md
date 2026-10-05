---
id: principle-gate-wire-format
title: Keep wire formats explicit
apply_when: Apply when validating wire formats for compatibility.
triggers:
  keywords: [serialize]
enforce: review
status: verified
---
> Pin the wire format in one place and validate against it.

## Patterns

- Write the format down before changing producers.
- Reject unknown fields explicitly.

## Tests

- Which producer and consumer share this format?
