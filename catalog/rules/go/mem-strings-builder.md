---
id: go-mem-strings-builder
lang: go
prefix: mem
title: Build strings incrementally with strings.Builder
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [string, builder, concatenation, allocation]
  files: ["**/*.go"]
  symbols: [strings.Builder]
related: [go-mem-slice-preallocate, go-mem-strings-cut]
sources:
  - title: Package strings - Builder
    url: https://pkg.go.dev/strings
  - title: "Go Slices: usage and internals"
    url: https://go.dev/blog/go-slices-usage-and-internals
---
> Accumulate with strings.Builder; repeated += copies the whole string each time.

## Why

Strings are immutable, so each += allocates a new string and copies everything written so far, which turns a loop over n fragments into quadratic work. The Builder documentation describes it as efficiently building a string while minimizing memory copying, with a zero value ready to use. Grow can reserve the final size when it is known.

## Bad

```go
func join(lines []string) string {
    var out string
    for _, line := range lines {
        out += line + "\n"
    }
    return out
}
```

## Good

```go
func join(lines []string) string {
    var b strings.Builder
    for _, line := range lines {
        b.WriteString(line)
        b.WriteByte('\n')
    }
    return b.String()
}
```

## See Also

- [go-mem-slice-preallocate](mem-slice-preallocate.md) - reserving capacity for slices
- [go-mem-strings-cut](mem-strings-cut.md) - splitting strings without extra passes
