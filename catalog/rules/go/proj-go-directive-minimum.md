---
id: go-proj-go-directive-minimum
lang: go
prefix: proj
title: Set the go directive to the oldest supported toolchain
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [go.mod, go directive, toolchain, compatibility]
  files: ["**/go.mod"]
  symbols: []
related: [go-proj-major-version-suffix, go-proj-go-mod-tidy]
sources:
  - title: Go Modules Reference - go directive
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - go.mod files
    url: https://go.dev/ref/mod
---
> The directive is a mandatory minimum now; do not raise it without need.

## Why

The modules reference says the go directive sets the minimum version of Go required to use the module, and that the requirement is now mandatory: Go toolchains refuse to use modules declaring newer Go versions. Declaring the toolchain on the author's laptop therefore locks out every user on an older release even when the code compiles there. The directive should name the oldest release the module supports and tests against, and it rises only when a language change is actually adopted.

## Bad

```go
// go.mod: go 1.27 (module code needs no feature past 1.24)
func Hello() string { return "hi" }
```

## Good

```go
// go.mod: go 1.24 (the oldest toolchain the module supports)
func Hello() string { return "hi" }
```

## See Also

- [go-proj-major-version-suffix](proj-major-version-suffix.md) - the other go.mod line consumers depend on
- [go-proj-go-mod-tidy](proj-go-mod-tidy.md) - keeping the rest of go.mod accurate
