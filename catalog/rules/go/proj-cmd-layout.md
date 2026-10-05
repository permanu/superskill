---
id: go-proj-cmd-layout
lang: go
prefix: proj
title: Keep commands in cmd/ when the module also exports packages
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cmd, main package, layout, binaries]
  files: ["**/*.go"]
  symbols: []
related: [go-proj-internal, go-proj-package-per-directory]
sources:
  - title: Organizing a Go module - Multiple commands
    url: https://go.dev/doc/modules/layout
  - title: Organizing a Go module - Packages and commands in the same repository
    url: https://go.dev/doc/modules/layout
---
> A cmd/ directory keeps main packages from sharing space with libraries.

## Why

The layout guide calls it a common convention to place all commands in a repository into a cmd directory, noting that while this is not strictly necessary in a repository that consists only of commands, it is very useful in a mixed repository that has both commands and importable packages. It also recommends keeping server logic in internal and all Go commands together in cmd. The separate directory keeps package main files from sitting next to library files and makes each binary's install path predictable.

## Bad

```go
// main.go at the module root, next to importable package files
func main() {}
```

## Good

```go
// cmd/app/main.go, importable packages stay at the module root
func main() {}
```

## See Also

- [go-proj-internal](proj-internal.md) - where the logic the command calls lives
- [go-proj-package-per-directory](proj-package-per-directory.md) - one package per directory
