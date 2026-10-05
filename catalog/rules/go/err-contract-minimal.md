---
id: go-err-contract-minimal
lang: go
prefix: err
title: Expose only the error conditions the API promises and keep the rest opaque
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error, sentinel, error type, API contract, abstraction]
  files: ["**/*.go"]
  symbols: [errors.Is, errors.As, errors.New]
related: [go-err-match-by-is-as, go-err-wrap-with-w, go-err-no-typed-nil]
sources:
  - title: Working with Errors in Go 1.13
    url: https://go.dev/blog/go1.13-errors
  - title: Google Go Style Best Practices - Error handling
    url: https://google.github.io/styleguide/go/best-practices
  - title: Package errors
    url: https://pkg.go.dev/errors
---
> Return sentinels for conditions callers branch on, typed errors for fields they inspect, and opaque errors otherwise.

## Why

The error a function returns is part of its API: once callers can unwrap it, changing the backend breaks them. Return a wrapped sentinel for categories the caller must switch on, an exported error type when callers need structured fields, and a repackaged `%v` error when the cause is an implementation detail. The wrapping guide states the rule directly: wrap to expose an error to callers, do not wrap when doing so would expose implementation details.

## Bad

```go
var ErrNotFound = errors.New("not found")

type User struct{ ID string }

var queryUser func(ctx context.Context, id string) (*User, error)

// FindUser returns ErrNotFound when no user has the given ID.
func FindUser(ctx context.Context, id string) (*User, error) {
    u, err := queryUser(ctx, id)
    if err != nil {
        return nil, err
    }
    return u, nil
}
```

## Good

```go
var ErrNotFound = errors.New("not found")

var errNoRows = errors.New("no rows")

type User struct{ ID string }

var queryUser func(ctx context.Context, id string) (*User, error)

// FindUser returns an error wrapping ErrNotFound when no user has the given ID.
func FindUser(ctx context.Context, id string) (*User, error) {
    u, err := queryUser(ctx, id)
    if err != nil {
        if errors.Is(err, errNoRows) {
            return nil, fmt.Errorf("%w: user %s", ErrNotFound, id)
        }
        return nil, fmt.Errorf("query user %s: %v", id, err)
    }
    return u, nil
}
```

## See Also

- [go-err-match-by-is-as](err-match-by-is-as.md) - how callers consume the contract this rule defines
- [go-err-wrap-with-w](err-wrap-with-w.md) - wrapping is what makes an error inspectable
- [go-err-no-typed-nil](err-no-typed-nil.md) - return type hygiene for the promised errors
