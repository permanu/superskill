---
id: go-mod-tool-directive
lang: go
prefix: mod
title: Track developer tools with the tool directive
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tool directive, tools.go, go tool, dev dependencies]
  files: ["**/go.mod"]
  symbols: []
related: [go-mod-toolchain-directive, go-mod-go-sum-commit]
sources:
  - title: Go Modules Reference - tool directive
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - go tool
    url: https://go.dev/ref/mod
  - title: Go Modules Reference - go mod tidy
    url: https://go.dev/ref/mod
---
> A tool line makes dev tools real dependencies without blank imports.

## Why

The modules reference says that since Go 1.24 a tool directive adds a package as a dependency of the current module and makes it available to run with go tool inside the module or its workspace. The older pattern of blank imports behind a build tag also keeps the dependency, because go mod tidy acts as if all build tags are enabled and considers files with custom build tags, but the tool then sits in the build graph as an ordinary dependency with no record that it is a tool. The directive names the tool in one place and makes it runnable with go tool.

## Bad

```go
// tools.go: blank imports hidden behind a build tag
func Version() string { return "1.0.0" }
```

## Good

```go
// go.mod: tool golang.org/x/tools/cmd/stringer
func Version() string { return "1.0.0" }
```

## See Also

- [go-mod-toolchain-directive](mod-toolchain-directive.md) - the directive that suggests the compiler itself
- [go-mod-go-sum-commit](mod-go-sum-commit.md) - where the tool's hashes land
