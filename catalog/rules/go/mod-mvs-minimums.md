---
id: go-mod-mvs-minimums
lang: go
prefix: mod
title: Treat require versions as minimums, not pins
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [require, minimal version selection, MVS, upgrade]
  files: ["**/go.mod"]
  symbols: []
related: [go-mod-semver-versions, go-mod-vendor-consistency]
sources:
  - title: Go Modules Reference - go get
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - Minimal version selection
    url: https://go.dev/ref/mod
---
> MVS picks the highest minimum in the graph; a lower require cannot force it down.

## Why

The modules reference says required versions in go.mod files are minimum versions and may be increased automatically as new dependencies are added, and it describes minimal version selection as the algorithm that chooses the versions actually built. Another module in the graph that requires a higher version wins, so a require line is not a pin. Recording the version the build actually resolves keeps the file honest about what ships.

## Bad

```go
// go.mod: require example.com/lib v1.2.0, expecting exactly v1.2.0
func Version() string { return "1.2.0" }
```

## Good

```go
// go.mod: require example.com/lib v1.5.2, the version the build resolves
func Version() string { return "1.5.2" }
```

## See Also

- [go-mod-semver-versions](mod-semver-versions.md) - how those versions are named
- [go-mod-vendor-consistency](mod-vendor-consistency.md) - keeping the resolved set checked in
