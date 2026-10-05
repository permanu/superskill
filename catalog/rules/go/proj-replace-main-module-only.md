---
id: go-proj-replace-main-module-only
lang: go
prefix: proj
title: Do not ship replace directives in a published module
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [replace directive, go.mod, local development, dependency]
  files: ["**/go.mod"]
  symbols: []
related: [go-proj-major-version-suffix, go-proj-go-mod-tidy]
sources:
  - title: Go Modules Reference - replace directive
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - Minimal version selection
    url: https://go.dev/ref/mod
---
> replace is ignored outside the main module, so consumers resolve the real version.

## Why

The modules reference states that replace directives only apply in the main module's go.mod file and are ignored in other modules. A replacement added for local debugging therefore keeps working on the author's machine while every consumer silently builds against the original requirement, so tests and production see different code. A released library should express its dependency with require and keep replacements in a workspace or an unpublished fork of the main module.

## Bad

```go
// go.mod of a published library:
// replace example.com/dep => ../local/dep
func Load() string { return "dep" }
```

## Good

```go
// go.mod of a published library:
// require example.com/dep v1.4.0
func Load() string { return "dep" }
```

## See Also

- [go-proj-major-version-suffix](proj-major-version-suffix.md) - another go.mod field whose effect stops at the module boundary
- [go-proj-go-mod-tidy](proj-go-mod-tidy.md) - keeping requirements truthful for consumers
