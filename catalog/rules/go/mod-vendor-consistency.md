---
id: go-mod-vendor-consistency
lang: go
prefix: mod
title: Keep vendor/modules.txt consistent with go.mod
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [vendor, modules.txt, go mod vendor, consistency]
  files: ["**/go.mod"]
  symbols: []
related: [go-mod-go-sum-commit, go-mod-mvs-minimums]
sources:
  - title: Go Modules Reference - Vendoring
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - go mod vendor
    url: https://go.dev/ref/mod
---
> Committed vendor trees must be regenerated when go.mod changes.

## Why

The modules reference says that when the go command reads vendor/modules.txt it checks that the module versions are consistent with go.mod, and that if go.mod has changed since the manifest was generated the go command reports an error. A vendor directory checked in without its manifest, or updated after a dependency bump, therefore fails every build that enables vendoring. Running go mod vendor after each change keeps the tree and the manifest in step.

## Bad

```go
// vendor/ committed without vendor/modules.txt
func Version() string { return "1.0.0" }
```

## Good

```go
// vendor/ and vendor/modules.txt both committed after go mod vendor
func Version() string { return "1.0.0" }
```

## See Also

- [go-mod-go-sum-commit](mod-go-sum-commit.md) - the hash file that goes with the dependency set
- [go-mod-mvs-minimums](mod-mvs-minimums.md) - the resolution vendoring records
