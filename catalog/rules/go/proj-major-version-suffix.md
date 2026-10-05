---
id: go-proj-major-version-suffix
lang: go
prefix: proj
title: End the module path with /vN for major version 2 and higher
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [module path, major version, /v2, release]
  files: ["**/go.mod"]
  symbols: []
related: [go-proj-go-directive-minimum, go-proj-replace-main-module-only]
sources:
  - title: Go Modules Reference - Module paths
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - Version queries
    url: https://go.dev/ref/mod
---
> A v2 release without /v2 in the path is rejected or treated as v1.

## Why

The modules reference says that if a module is released at major version 2 or higher, the module path must end with a major version suffix like /v2, and repeats that starting with major version 2 module paths must have a suffix matching the major version. A repository that tags v2.0.0 while keeping the v1 path cannot serve that version as an importable module, and consumers keep resolving the old path. Bumping the suffix is what makes the incompatible release selectable under minimal version selection.

## Bad

```go
// go.mod: module example.com/lib (released as v2.0.0)
func Version() string { return "2.0.0" }
```

## Good

```go
// go.mod: module example.com/lib/v2 (released as v2.0.0)
func Version() string { return "2.0.0" }
```

## See Also

- [go-proj-go-directive-minimum](proj-go-directive-minimum.md) - the other go.mod line that affects consumers
- [go-proj-replace-main-module-only](proj-replace-main-module-only.md) - directives that do not travel with the module
