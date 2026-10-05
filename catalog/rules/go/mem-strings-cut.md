---
id: go-mem-strings-cut
lang: go
prefix: mem
title: Split strings with strings.Cut instead of Index plus slicing
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [strings.Cut, split, index, parsing]
  files: ["**/*.go"]
  symbols: [strings.Cut]
related: [go-mem-strings-builder, go-mem-map-clear]
sources:
  - title: Package strings - Cut
    url: https://pkg.go.dev/strings
  - title: Go Release Notes
    url: https://go.dev/doc/go1.27
---
> Ask Cut for the before, after, and found values in one call.

## Why

Index returns -1 for a missing separator, so every caller re-derives the boundary and the not-found case by hand. Cut returns before, after, and found together, which removes the off-by-one slicing and the sentinel check. The same helper family covers prefixes, suffixes, and the last occurrence, so parsing code reads as a sequence of cuts.

## Bad

```go
func splitKV(s string) (string, string) {
    i := strings.Index(s, "=")
    if i < 0 {
        return s, ""
    }
    return s[:i], s[i+1:]
}
```

## Good

```go
func splitKV(s string) (string, string) {
    k, v, _ := strings.Cut(s, "=")
    return k, v
}
```

## See Also

- [go-mem-strings-builder](mem-strings-builder.md) - rebuilding strings efficiently
- [go-mem-map-clear](mem-map-clear.md) - the same one-call simplification for maps
