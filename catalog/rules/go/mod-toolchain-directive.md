---
id: go-mod-toolchain-directive
lang: go
prefix: mod
title: Treat the toolchain line as a suggestion for the main module
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [toolchain directive, go.mod, version selection]
  files: ["**/go.mod"]
  symbols: []
related: [go-mod-tool-directive, go-proj-go-directive-minimum]
sources:
  - title: Go Modules Reference - toolchain directive
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - go directive
    url: https://go.dev/ref/mod
---
> The toolchain line only acts on the main module and only when it is behind.

## Why

The modules reference says a toolchain directive declares a suggested Go toolchain and that it only has an effect when the module is the main module and the default toolchain's version is less than the suggested version. It cannot be less than the version required by the go directive, and it never overrides a consumer's newer toolchain. Treating it as a hard requirement for everyone misreads the directive; the go directive is the part that sets the floor.

## Bad

```go
// go.mod: toolchain go1.27.1, relied on to build the library for consumers
func Version() string { return "1.0.0" }
```

## Good

```go
// go.mod: toolchain go1.27.1 for local builds; consumers use their own
func Version() string { return "1.0.0" }
```

## See Also

- [go-mod-tool-directive](mod-tool-directive.md) - declaring the tools the module needs
- [go-proj-go-directive-minimum](proj-go-directive-minimum.md) - the directive that consumers actually obey
