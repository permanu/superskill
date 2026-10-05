---
id: go-mod-semver-versions
lang: go
prefix: mod
title: Tag releases as vX.Y.Z semantic versions
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [version tag, semantic version, release, v1]
  files: ["**/go.mod"]
  symbols: []
related: [go-mod-module-path-location, go-mod-pseudo-versions]
sources:
  - title: Go Modules Reference - Versions
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - Mapping versions to commits
    url: https://go.dev/ref/mod
---
> Each module version starts with v and a semantic version, or it is invisible.

## Why

The modules reference says a version identifies an immutable snapshot of a module and that each version starts with the letter v, followed by a semantic version. A tag named release-1.2.0 or 1.2.0 therefore never becomes a module version, so consumers can only reach the commit through a pseudo-version. The repository tag and the version query syntax must match exactly.

## Bad

```go
// git tag: release-1.2.0
func Version() string { return "1.2.0" }
```

## Good

```go
// git tag: v1.2.0
func Version() string { return "1.2.0" }
```

## See Also

- [go-mod-module-path-location](mod-module-path-location.md) - the other half of the module's identity
- [go-mod-pseudo-versions](mod-pseudo-versions.md) - what happens when no tag exists
