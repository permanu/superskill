---
id: go-api-keyed-struct-literals
lang: go
prefix: api
title: Use keyed fields in composite literals for types from other packages
severity: should
enforce: tool
tool: go vet:composites
baseline: latest
status: verified
triggers:
  keywords: [composite literal, keyed fields, compatibility, struct]
  files: ["**/*.go"]
  symbols: [fs.PathError]
related: [go-api-unexport-unsupported, go-api-options-struct]
sources:
  - title: Go 1 and the Future of Go Programs - Struct literals
    url: https://go.dev/doc/go1compat
  - title: Google Go Style Decisions - Field names
    url: https://google.github.io/styleguide/go/decisions
  - title: cmd/vet - composites
    url: https://pkg.go.dev/cmd/vet
---
> Name every field when constructing another package's struct.

## Why

A field added to an external struct breaks every unkeyed literal; the Go 1 compatibility document calls this out and recommends keyed notation for composite literals whose type is defined in a separate package. Field names also show which value goes where, so a reordered pair cannot silently swap. The vet composites check reports the unkeyed form.

## Bad

```go
func notFound(op, path string) error {
    return &fs.PathError{op, path, fs.ErrNotExist}
}
```

## Good

```go
func notFound(op, path string) error {
    return &fs.PathError{Op: op, Path: path, Err: fs.ErrNotExist}
}
```

## See Also

- [go-api-unexport-unsupported](api-unexport-unsupported.md) - the compatibility promise behind this rule
- [go-api-options-struct](api-options-struct.md) - self-documenting construction inside your own package
