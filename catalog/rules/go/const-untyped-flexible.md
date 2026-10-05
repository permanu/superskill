---
id: go-const-untyped-flexible
lang: go
prefix: const
title: Leave constants untyped unless the type is part of the API
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [untyped constants, default type, conversions]
  files: ["**/*.go"]
  symbols: []
related: [go-const-typed-enum, go-const-not-var]
sources:
  - title: The Go Programming Language Specification - Constants
    url: https://go.dev/ref/spec
---
> An untyped constant converts to whatever numeric type the context needs.

## Why

The specification says an untyped constant has a default type that is used only in contexts where a typed value is required, and that constants may be typed or untyped. A typed constant limits every use to that one type, while an untyped one converts to whichever numeric type the context needs. Leaving limits untyped avoids conversions at every call site.

## Bad

```go
const maxUsers int32 = 100

var users int32 = maxUsers
```

## Good

```go
const maxUsers = 100

var users int32 = maxUsers
```

## See Also

- [go-const-typed-enum](const-typed-enum.md) - when typing the constant is the point
- [go-const-not-var](const-not-var.md) - the other declaration choice for fixed values
