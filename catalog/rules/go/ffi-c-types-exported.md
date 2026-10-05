---
id: go-ffi-c-types-exported
lang: go
prefix: ffi
title: Keep C types out of the exported API
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cgo, C types, exported API, boundary]
  files: ["**/*.go"]
  symbols: []
related: [go-ffi-cstring-free, go-api-unexport-unsupported]
sources:
  - title: cmd/cgo - Go references to C
    url: https://pkg.go.dev/cmd/cgo
  - title: Go Code Review Comments - Interfaces
    url: https://go.dev/wiki/CodeReviewComments
---
> C.int in one package is a different type from C.int in another.

## Why

The cgo documentation says cgo translates C types into equivalent unexported Go types, and that because the translations are unexported a package should not expose C types in its exported API: a C type used in one package is different from the same C type used in another. An exported C.int therefore cannot be used by callers without importing C themselves. Keeping C types internal and converting at the boundary preserves a normal Go API.

## Bad

```go
// Size returns a C.int, a distinct type in every package that imports C.
func Size() int32 { return 0 }
```

## Good

```go
// Size returns a Go int; C types stay behind the package boundary.
func Size() int { return 0 }
```

## See Also

- [go-ffi-cstring-free](ffi-cstring-free.md) - the other boundary rule that keeps cgo contained
- [go-api-unexport-unsupported](api-unexport-unsupported.md) - keeping unsupported details out of the API
