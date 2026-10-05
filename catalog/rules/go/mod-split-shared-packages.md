---
id: go-mod-split-shared-packages
lang: go
prefix: mod
title: Split packages meant for sharing into their own module
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [module split, shared library, server, versioning]
  files: ["**/go.mod"]
  symbols: []
related: [go-mod-module-path-location, go-mod-unstable-v0]
sources:
  - title: Organizing a Go module - Server project
    url: https://go.dev/doc/modules/layout
  - title: Go Modules Reference - Module paths
    url: https://go.dev/ref/mod
---
> A shared client versioned with the server drags the server along.

## Why

The layout guide says that when a server repository grows packages that become useful for sharing with other projects, it is best to split them off to separate modules. A shared client trapped inside the server module forces every consumer to take the server's import path, dependencies, and release cadence. A separate module gives the shared code its own path and its own version line, so it can be released and deprecated independently.

## Bad

```go
// one module exports both the server binary and the shared client library
func Version() string { return "1.0.0" }
```

## Good

```go
// server imports the client from its own module example.com/client
func Version() string { return "1.0.0" }
```

## See Also

- [go-mod-module-path-location](mod-module-path-location.md) - naming the new module's path
- [go-mod-unstable-v0](mod-unstable-v0.md) - what stability the new module starts at
