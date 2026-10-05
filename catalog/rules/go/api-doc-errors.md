---
id: go-api-doc-errors
lang: go
prefix: api
title: Document the error conditions callers may test for
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error, doc comment, sentinel, API contract]
  files: ["**/*.go"]
  symbols: [errors.Is]
related: [go-api-doc-exported, go-api-return-zero-on-error, go-err-contract-minimal]
sources:
  - title: Working with Errors in Go 1.13
    url: https://go.dev/blog/go1.13-errors
  - title: Google Go Style Best Practices - Error handling
    url: https://google.github.io/styleguide/go/best-practices
---
> State in the doc comment which sentinels or error types callers may match.

## Why

A package that returns errors should describe which properties of those errors programmers may rely on, because wrapping an error makes it part of the API. Without that statement, callers either guess with string matching or avoid handling the condition at all. Naming the sentinel or type in the doc comment lets callers write `errors.Is` or `errors.As` checks that survive message changes.

## Bad

```go
var ErrNotFound = errors.New("not found")

type User struct{ ID string }

func Find(id string) (*User, error) { return nil, ErrNotFound }
```

## Good

```go
var ErrNotFound = errors.New("not found")

type User struct{ ID string }

// Find returns an error wrapping ErrNotFound when no user has the given ID.
func Find(id string) (*User, error) { return nil, ErrNotFound }
```

## See Also

- [go-api-doc-exported](api-doc-exported.md) - the general doc comment conventions
- [go-api-return-zero-on-error](api-return-zero-on-error.md) - results on the failure path
- [go-err-contract-minimal](err-contract-minimal.md) - choosing what to expose
