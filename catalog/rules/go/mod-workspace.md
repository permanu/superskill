---
id: go-mod-workspace
lang: go
prefix: mod
title: Use a go.work workspace for multi-module local development
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [go.work, workspace, multi-module, local development]
  files: ["**/go.mod"]
  symbols: []
related: [go-mod-go-sum-commit, go-proj-replace-main-module-only]
sources:
  - title: Go Modules Reference - Workspaces
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - replace directive
    url: https://go.dev/ref/mod
---
> A workspace file gives the local view without changing any module.

## Why

The modules reference defines a workspace as a collection of modules on disk used as the main modules for minimal version selection, declared in a go.work file that lists relative paths to each module directory. A replace directive committed in go.mod applies to everyone working in the module, while a workspace file provides the same local wiring without touching any module's file. The reference also notes that conflicting replaces across main modules are resolved through a replace in the go.work file.

## Bad

```go
// go.mod: replace example.com/lib => ../lib committed for local development
func Version() string { return "1.0.0" }
```

## Good

```go
// go.work: use ./lib (workspace file, kept out of any module)
func Version() string { return "1.0.0" }
```

## See Also

- [go-mod-go-sum-commit](mod-go-sum-commit.md) - what the workspace still checks in
- [go-proj-replace-main-module-only](proj-replace-main-module-only.md) - why the replace does not belong in a release
