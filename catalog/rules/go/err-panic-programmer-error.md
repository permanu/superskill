---
id: go-err-panic-programmer-error
lang: go
prefix: err
title: Panic only for programmer errors and invariants, return errors for caller-triggerable failures
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [panic, error, invariant, programmer error, API misuse]
  files: ["**/*.go"]
  symbols: [panic]
related: [go-err-recover-translate, go-err-no-typed-nil]
sources:
  - title: Go Code Review Comments - Don't Panic
    url: https://go.dev/wiki/CodeReviewComments
  - title: Google Go Style Best Practices - When to panic
    url: https://google.github.io/styleguide/go/best-practices
  - title: Go FAQ - Why does Go not have exceptions?
    url: https://go.dev/doc/faq
---
> Panic only for bugs and violated invariants; return errors for failures a caller can trigger.

## Why

Panic bypasses the caller's ability to recover, report, or retry, so using it for invalid input turns one bad request into a dead process. Go reserves panic for states no caller can fix: misuse the type system cannot prevent, or an internal invariant that is already broken. Expected failures travel as error values, which the caller can handle deliberately.

## Bad

```go
func parseLimit(raw string) int {
    n, err := strconv.Atoi(raw)
    if err != nil {
        panic("bad limit: " + raw)
    }
    return n
}
```

## Good

```go
func parseLimit(raw string) (int, error) {
    n, err := strconv.Atoi(raw)
    if err != nil {
        return 0, fmt.Errorf("parse limit %q: %w", raw, err)
    }
    if n < 0 {
        return 0, fmt.Errorf("limit %d must not be negative", n)
    }
    return n, nil
}
```

## See Also

- [go-err-recover-translate](err-recover-translate.md) - what to do with the panics that remain
- [go-err-no-typed-nil](err-no-typed-nil.md) - reporting success and failure through the same return
