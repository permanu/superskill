---
id: go-err-join
lang: go
prefix: err
title: Combine independent errors with errors.Join instead of dropping all but the first
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error, join, aggregate, cleanup, multiple errors]
  files: ["**/*.go"]
  symbols: [errors.Join]
related: [go-err-goroutine-collect, go-err-partial-result, go-err-no-ignore]
sources:
  - title: Package errors - Join
    url: https://pkg.go.dev/errors
  - title: Google Go Style Best Practices - Error handling
    url: https://google.github.io/styleguide/go/best-practices
---
> Merge independent failures with errors.Join so every cause survives to the caller.

## Why

Cleanup steps and parallel subtasks fail independently; keeping only the first error discards real failures, and overwriting one variable keeps only the last. `errors.Join` returns a single error that formats each child on its own line and answers `errors.Is` and `errors.As` across all of them. It ignores nil children and returns nil when every child is nil, so callers need no special case.

## Bad

```go
type Conn struct{}

func (c *Conn) flush() error     { return nil }
func (c *Conn) closeConn() error { return nil }

func (c *Conn) Close() error {
    err := c.flush()
    _ = c.closeConn()
    return err
}
```

## Good

```go
type Conn struct{}

func (c *Conn) flush() error     { return nil }
func (c *Conn) closeConn() error { return nil }

func (c *Conn) Close() error {
    var errs []error
    if err := c.flush(); err != nil {
        errs = append(errs, fmt.Errorf("flush: %w", err))
    }
    if err := c.closeConn(); err != nil {
        errs = append(errs, fmt.Errorf("close: %w", err))
    }
    return errors.Join(errs...)
}
```

## See Also

- [go-err-goroutine-collect](err-goroutine-collect.md) - joining is the final step of collecting goroutine errors
- [go-err-partial-result](err-partial-result.md) - results, not just errors, survive a partial failure
- [go-err-no-ignore](err-no-ignore.md) - the failures Join exists to preserve
