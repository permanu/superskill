---
id: go-gen-named-slice-constraint
lang: go
prefix: gen
title: Constrain slice helpers with ~[]E so named slice types keep their identity
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generics, named types, tilde, slice constraint]
  files: ["**/*.go"]
  symbols: []
related: [go-gen-stdlib-helpers, go-gen-write-code-first]
sources:
  - title: Package slices - Clone
    url: https://pkg.go.dev/slices
  - title: The Go Programming Language Specification - Interface types
    url: https://go.dev/ref/spec
---
> Write slice helpers as [S ~[]E, E any](s S) S, matching the slices package.

## Why

The slices package declares Clone as [S ~[]E, E any](s S) S, returning the caller's own slice type rather than a plain []E. A helper written over []E compiles for a named type such as IDs but silently converts the result to []int, so the type stops carrying its methods and meaning. The tilde in the constraint admits every type whose underlying type is []E, which is exactly the slice family.

## Bad

```go
func Clone[E any](s []E) []E {
    return append([]E(nil), s...)
}
```

## Good

```go
func Clone[S ~[]E, E any](s S) S {
    return append(s[:0:0], s...)
}
```

## See Also

- [go-gen-stdlib-helpers](gen-stdlib-helpers.md) - the helpers that already use this pattern
- [go-gen-write-code-first](gen-write-code-first.md) - deciding to write the helper at all
