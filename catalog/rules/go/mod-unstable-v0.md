---
id: go-mod-unstable-v0
lang: go
prefix: mod
title: Keep an unsettled API at major version 0
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [v0, unstable, compatibility, semver]
  files: ["**/go.mod"]
  symbols: []
related: [go-mod-semver-versions, go-proj-major-version-suffix]
sources:
  - title: Go Modules Reference - Versions
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - Module paths
    url: https://go.dev/ref/mod
---
> v0 and pre-releases carry no compatibility promise; v1 does.

## Why

The modules reference says a version is considered unstable if its major version is 0 or it has a pre-release suffix, and that unstable versions are not subject to compatibility requirements. Tagging v1.0.0 before the API settles promises compatibility the project cannot keep, and escaping it later requires a /v2 path and a new import line. Staying at v0 while the design moves keeps the promise honest and the path stable.

## Bad

```go
// go.mod: module example.com/lib, tagged v1.0.0 before the API settles
func Version() string { return "1.0.0" }
```

## Good

```go
// go.mod: module example.com/lib, tagged v0.3.0 while the API settles
func Version() string { return "0.3.0" }
```

## See Also

- [go-mod-semver-versions](mod-semver-versions.md) - the tag format either way
- [go-proj-major-version-suffix](proj-major-version-suffix.md) - the path change that a v1 mistake forces
