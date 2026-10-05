---
id: go-proj-package-per-directory
lang: go
prefix: proj
title: Keep one package per directory
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [package layout, directory, package clause]
  files: ["**/*.go"]
  symbols: []
related: [go-proj-internal, go-proj-util-package]
sources:
  - title: The Go Programming Language Specification - Packages
    url: https://go.dev/ref/spec
  - title: Organizing a Go module - Multiple packages
    url: https://go.dev/doc/modules/layout
---
> A directory holds exactly one package; split by directory, not by file.

## Why

The specification says a set of files sharing the same package name form the implementation of a package, and that an implementation may require all source files for a package to inhabit the same directory. Organizing a Go module confirms that each package has its own directory and can be nested hierarchically. Two package clauses in one directory are therefore a build error, and the fix is a directory per package rather than renaming files.

## Bad

```go
// model/user.go: package model
type User struct{ Name string }

// model/store.go: package store, same directory as package model
type Store struct{}
```

## Good

```go
// model/user.go: package model
type User struct{ Name string }

// store/store.go: package store, its own directory
type Store struct{}
```

## See Also

- [go-proj-internal](proj-internal.md) - where supporting packages go by default
- [go-proj-util-package](proj-util-package.md) - naming the package that owns the directory
