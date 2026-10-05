---
id: principle-parse-boundary
title: Parse external input at the boundary
apply_when: Apply when external data enters the program.
triggers:
  keywords: [parse, boundary, validate]
  symbols: [JSON.parse]
enforce: review
status: verified
sources:
  - title: Example source
    url: https://example.com/parse
---
> Parse external input once at the boundary, then trust the typed value inward.

## Patterns

- Validate shape at the edge.
- Convert to a typed value before passing it inward.

## Tests

- Where does untrusted input first become typed?

## See Also

- [evidence-before-done](evidence-before-done.md) - the evidence for the parse
