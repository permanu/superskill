---
id: go-mod-private-modules
lang: go
prefix: mod
title: Mark private module paths with GOPRIVATE
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [GOPRIVATE, GONOSUMDB, private modules, proxy]
  files: ["**/go.mod"]
  symbols: []
related: [go-mod-go-sum-commit, go-mod-module-path-location]
sources:
  - title: Go Modules Reference - Authenticating modules
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - GOPRIVATE
    url: https://go.dev/ref/mod
---
> Private paths must skip the public proxy and checksum database.

## Why

The modules reference says the GOPRIVATE and GONOSUMDB environment variables can disable requests to the checksum database for specific modules, and that GOPRIVATE or GONOPROXY control downloading directly from source repositories. Without them, the go command looks a private path up through the public proxy and checksum database, which a private server will refuse. Matching the private prefix once in the environment fixes every module and command that touches it.

## Bad

```go
// go env: GOPRIVATE unset; corp.example.com goes through the public proxy
func Fetch() string { return "" }
```

## Good

```go
// go env: GOPRIVATE=corp.example.com
func Fetch() string { return "" }
```

## See Also

- [go-mod-go-sum-commit](mod-go-sum-commit.md) - the checksum file private paths bypass
- [go-mod-module-path-location](mod-module-path-location.md) - choosing the path that gets matched
