---
id: go-err-no-typed-nil
lang: go
prefix: err
title: Never return a typed nil pointer through an error interface
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error, nil, interface, typed nil, zero value]
  files: ["**/*.go"]
  symbols: [nil]
related: [go-err-contract-minimal, go-err-panic-programmer-error]
sources:
  - title: Go FAQ - Why is my nil error value not equal to nil?
    url: https://go.dev/doc/faq
  - title: Google Go Style Decisions - Returning errors
    url: https://google.github.io/styleguide/go/decisions
---
> Return explicit nil on success; never return a typed nil pointer as an error.

## Why

An interface value is nil only when both its type and its value are unset, so a nil `*validationError` stored in an error makes `err != nil` true while there is nothing to print. Callers then treat success paths as failures. Declare the result as `error` and return the literal `nil`; construct the concrete error value only on the failure path.

## Bad

```go
type validationError struct{ field string }

func (e *validationError) Error() string { return "invalid " + e.field }

func validate(name string) error {
    var verr *validationError
    if name == "" {
        verr = &validationError{field: "name"}
    }
    return verr
}
```

## Good

```go
type validationError struct{ field string }

func (e *validationError) Error() string { return "invalid " + e.field }

func validate(name string) error {
    if name == "" {
        return &validationError{field: "name"}
    }
    return nil
}
```

## See Also

- [go-err-contract-minimal](err-contract-minimal.md) - exported error types require extra care with nil
- [go-err-panic-programmer-error](err-panic-programmer-error.md) - the other way success states get misreported
