---
id: go-mod-go-install-version
lang: go
prefix: mod
title: Install tools with go install pkg@version
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [go install, tool version, "@version", install]
  files: ["**/go.mod"]
  symbols: []
related: [go-mod-tool-directive, go-mod-unstable-v0]
sources:
  - title: Go Modules Reference - go install
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - Version queries
    url: https://go.dev/ref/mod
---
> The version suffix installs a tool without touching the module's graph.

## Why

The modules reference says that since Go 1.16 go install is the recommended command for building and installing programs, and that with a version suffix like @v1.4.6 it builds in module-aware mode while ignoring the go.mod file in the current directory or any parent. Adding a tool to the module's requirements instead mixes development tooling into the dependency graph that ships. Pinning the tool at the install command keeps the library's go.mod about the library.

## Bad

```go
// Tool installed by adding it to this module's requirements and building locally.
func Version() string { return "1.4.0" }
```

## Good

```go
// go install example.com/tool@v1.4.6 (ignores this go.mod)
func Version() string { return "1.4.6" }
```

## See Also

- [go-mod-tool-directive](mod-tool-directive.md) - when the tool genuinely belongs in go.mod
- [go-mod-unstable-v0](mod-unstable-v0.md) - reading the stability of the pinned version
