---
id: go-proj-internal
lang: go
prefix: proj
title: Put supporting packages under internal by default
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [internal, layout, module boundary, refactor]
  files: ["**/*.go"]
  symbols: []
related: [go-proj-cmd-layout, go-proj-package-per-directory]
sources:
  - title: Organizing a Go module - Package or command with supporting packages
    url: https://go.dev/doc/modules/layout
  - title: Organizing a Go module - Multiple packages
    url: https://go.dev/doc/modules/layout
---
> Start in internal; other modules cannot import it, so you can refactor freely.

## Why

The layout guide recommends placing supporting packages into a directory named internal initially, because that prevents other modules from depending on packages you do not want to expose and support, and it adds that packages should be kept in internal as much as possible. Code outside the module cannot import an internal path, so its API can change without a compatibility review. Promoting a package to a public import path later is a deliberate act, while demoting one that consumers already import is a breaking change.

## Bad

```go
// parse/parse.go: package parse, importable by any module
func Parse(data []byte) ([]string, error) { return nil, nil }
```

## Good

```go
// internal/parse/parse.go: package parse, other modules cannot import it
func Parse(data []byte) ([]string, error) { return nil, nil }
```

## See Also

- [go-proj-cmd-layout](proj-cmd-layout.md) - where commands go in a mixed repository
- [go-proj-package-per-directory](proj-package-per-directory.md) - one package per directory
