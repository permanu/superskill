---
id: go-style-constant-names
lang: go
prefix: style
title: Name constants with MixedCaps, not SCREAMING_CASE
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constant, naming, mixed caps, enum]
  files: ["**/*.go"]
  symbols: []
related: [go-style-underscore-names, go-style-initialisms]
sources:
  - title: Google Go Style Decisions - Constant names
    url: https://google.github.io/styleguide/go/decisions
  - title: Go Code Review Comments - Mixed Caps
    url: https://go.dev/wiki/CodeReviewComments
---
> Write constants in MixedCaps and name them for their role, not their value.

## Why

Constants are identifiers like any other, so MAX_PACKET_SIZE and kMaxBufferSize read as imports from other languages. The style decisions require MixedCaps even where it breaks local convention, and ask that a constant name explain what the value denotes rather than repeat it. The exported form is MaxPacketSize; the unexported form maxPacketSize.

## Bad

```go
const MAX_PACKET_SIZE = 512
```

## Good

```go
const MaxPacketSize = 512
```

## See Also

- [go-style-underscore-names](style-underscore-names.md) - the same MixedCaps rule for variables and functions
- [go-style-initialisms](style-initialisms.md) - casing for acronyms inside the name
