---
id: go-mod-go-sum-commit
lang: go
prefix: mod
title: Commit go.sum and regenerate it with go mod tidy
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [go.sum, checksums, go mod tidy, commit]
  files: ["**/go.sum"]
  symbols: []
related: [go-mod-vendor-consistency, go-mod-private-modules]
sources:
  - title: Go Modules Reference - go.sum files
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - go mod tidy
    url: https://go.dev/ref/mod
---
> go.sum pins the hashes the build verifies; edit it only via tidy.

## Why

The modules reference says the go.sum file contains cryptographic hashes of the module's direct and indirect dependencies, and that when the go command downloads a module it computes a hash and checks it against the main module's go.sum. It also says go mod tidy adds missing hashes and removes unnecessary ones. Deleting lines by hand to get past a mismatch removes the verification that detects a swapped or corrupted dependency.

## Bad

```go
// go.sum: entries deleted by hand to resolve a hash mismatch
func Version() string { return "1.0.0" }
```

## Good

```go
// go.sum: regenerated with go mod tidy and committed
func Version() string { return "1.0.0" }
```

## See Also

- [go-mod-vendor-consistency](mod-vendor-consistency.md) - the other checked-in artifact of the dependency set
- [go-mod-private-modules](mod-private-modules.md) - paths that skip the checksum database
