---
id: go-conv-short-var-decl
lang: go
prefix: conv
title: Prefer := for new variables with a non-zero value
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [short variable declaration, var, initialization]
  files: ["**/*.go"]
  symbols: []
related: [go-conv-slices-over-arrays, go-style-variable-scope]
sources:
  - title: Google Go Style Best Practices - Variable declarations
    url: https://google.github.io/styleguide/go/best-practices
  - title: The Go Programming Language Specification - Short variable declarations
    url: https://go.dev/ref/spec
---
> One declaration with an inferred type reads cleaner than two forms.

## Why

The style guide says that for consistency, prefer := over var when initializing a new variable with a non-zero value. The short form states the type once, inferred from the value, and reads as a single declaration. var remains the right tool for a zero value, for a type the value does not carry, and for package-level variables.

## Bad

```go
func config() int {
    var retries = 3
    return retries
}
```

## Good

```go
func config() int {
    retries := 3
    return retries
}
```

## See Also

- [go-conv-slices-over-arrays](conv-slices-over-arrays.md) - another declaration-style convention
- [go-style-variable-scope](style-variable-scope.md) - naming variables for their scope
