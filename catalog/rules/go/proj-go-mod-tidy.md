---
id: go-proj-go-mod-tidy
lang: go
prefix: proj
title: Keep go.mod and go.sum current with go mod tidy
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [go.mod, go.sum, go mod tidy, dependencies]
  files: ["**/go.mod", "**/go.sum"]
  symbols: []
related: [go-proj-go-directive-minimum, go-proj-replace-main-module-only]
sources:
  - title: Go Modules Reference - go mod tidy
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - go.mod files
    url: https://go.dev/ref/mod
---
> Stale requirements mislead builds; tidy makes the files match the code.

## Why

The modules reference says go mod tidy ensures that the go.mod file matches the source code in the module, adding missing requirements, removing requirements on modules that no longer provide relevant packages, and fixing go.sum entries the same way. It also notes that most commands report an error when go.mod is missing information or does not accurately reflect reality, and that go get and go mod tidy fix most of those problems. Requirements left behind after a dependency is deleted keep it in the build graph and hide the fact that nothing imports it.

## Bad

```go
// go.mod: requirements left over from code that was deleted
func Build() string { return "ok" }
```

## Good

```go
// go.mod: kept current by running go mod tidy
func Build() string { return "ok" }
```

## See Also

- [go-proj-go-directive-minimum](proj-go-directive-minimum.md) - the go line tidy maintains
- [go-proj-replace-main-module-only](proj-replace-main-module-only.md) - directives tidy will not clean up for you
