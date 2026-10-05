---
id: go-gen-generic-methods
lang: go
prefix: gen
title: Put a generic operation on its type as a method, not a package-level function
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generic methods, receiver, type parameters, namespace]
  files: ["**/*.go"]
  symbols: []
related: [go-gen-write-code-first, go-gen-containers]
sources:
  - title: Go Release Notes - generic methods
    url: https://go.dev/doc/go1.27
---
> Declare the type parameters on the method so the operation lives in the type's namespace.

## Why

The release notes describe generic methods as allowing a method declaration to carry its own type parameters, which puts a generic function in the namespace of a data type instead of the whole package. A package-level helper forces callers to remember an unrelated name and cannot be discovered through the type's documentation. The same release notes mark the boundary: interface methods still cannot declare type parameters, so this applies to concrete types.

## Bad

```go
type Rand struct{}

func Pick[Int int](r *Rand, n Int) Int { return n }
```

## Good

```go
type Rand struct{}

func (r *Rand) Pick[Int int](n Int) Int { return n }
```

## See Also

- [go-gen-write-code-first](gen-write-code-first.md) - whether the generic form is needed at all
- [go-gen-containers](gen-containers.md) - methods on a generic receiver type
