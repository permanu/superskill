---
id: go-mod-retract
lang: go
prefix: mod
title: Retract broken releases instead of deleting tags
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [retract, broken release, tag, go.mod]
  files: ["**/go.mod"]
  symbols: []
related: [go-mod-semver-versions, go-mod-go-install-version]
sources:
  - title: Go Modules Reference - Retracting a version
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - go mod edit -retract
    url: https://go.dev/ref/mod
---
> A retract line steers users away without breaking existing builds.

## Why

The modules reference says that when a module version is retracted, users will not upgrade to it automatically with go get or go mod tidy, while builds that already depend on it continue to work. Deleting or moving a tag instead breaks everyone who pinned that version and can violate the module cache's immutability. A retract directive published in a later version turns a broken release into a skip rather than an outage.

## Bad

```go
// go.mod: v1.2.0 deleted from the repository after release
func Version() string { return "1.2.1" }
```

## Good

```go
// go.mod: retract v1.2.0, then release v1.2.1
func Version() string { return "1.2.1" }
```

## See Also

- [go-mod-semver-versions](mod-semver-versions.md) - the version naming that retract refers to
- [go-mod-go-install-version](mod-go-install-version.md) - how users pick versions when installing
