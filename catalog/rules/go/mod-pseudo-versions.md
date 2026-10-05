---
id: go-mod-pseudo-versions
lang: go
prefix: mod
title: Require tagged versions, not pseudo-versions, in releases
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pseudo-version, tag, release, commit]
  files: ["**/go.mod"]
  symbols: []
related: [go-mod-semver-versions, go-mod-mvs-minimums]
sources:
  - title: Go Modules Reference - Pseudo-versions
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - Versions
    url: https://go.dev/ref/mod
---
> Pseudo-versions pin a commit; releases should pin a version.

## Why

The modules reference says pseudo-versions may refer to revisions for which no semantic version tags are available and may be used to test commits before creating version tags. A released module that requires a pseudo-version freezes an unreleased commit with no compatibility signal and no way for other projects to reason about upgrades. Tagging the revision and requiring the tag gives the dependency a version that participates in minimal version selection.

## Bad

```go
// go.mod: require example.com/lib v1.2.3-0.20260101000000-abcdef123456
func Version() string { return "1.2.3" }
```

## Good

```go
// go.mod: require example.com/lib v1.2.3
func Version() string { return "1.2.3" }
```

## See Also

- [go-mod-semver-versions](mod-semver-versions.md) - creating the tag the release needs
- [go-mod-mvs-minimums](mod-mvs-minimums.md) - how the required version is selected
