---
id: go-mod-module-path-location
lang: go
prefix: mod
title: Make the module path name where the code lives
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [module path, repository, go.mod, import path]
  files: ["**/go.mod"]
  symbols: []
related: [go-mod-semver-versions, go-mod-pseudo-versions]
sources:
  - title: Go Modules Reference - Module paths
    url: https://go.dev/ref/mod
  - title: Organizing a Go module
    url: https://go.dev/doc/modules/layout
---
> The module path is both the import prefix and the download location.

## Why

The modules reference says a module path should describe both what the module does and where to find it, typically built from the repository root path, a directory within the repository, and a major version suffix when needed. A bare name like helpers cannot be fetched, imported, or resolved to a repository, so the module is unusable outside its own checkout. The layout guide makes the same assumption when it derives import paths from the repository URL.

## Bad

```go
// go.mod: module helpers
func Version() string { return "1.0.0" }
```

## Good

```go
// go.mod: module github.com/acme/helpers
func Version() string { return "1.0.0" }
```

## See Also

- [go-mod-semver-versions](mod-semver-versions.md) - the version tags that go with the path
- [go-mod-pseudo-versions](mod-pseudo-versions.md) - resolving revisions without tags
