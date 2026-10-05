---
id: go-err-no-ignore
lang: go
prefix: err
title: Handle every error or document why discarding it is safe
severity: must
enforce: tool
tool: errcheck
baseline: latest
status: verified
triggers:
  keywords: [error, ignore, blank identifier, discard, handle]
  files: ["**/*.go"]
  symbols: [errors.New, fmt.Errorf]
related: [go-err-join, go-err-log-once]
sources:
  - title: Go Code Review Comments - Handle Errors
    url: https://go.dev/wiki/CodeReviewComments
  - title: Google Go Style Decisions - Handle errors
    url: https://google.github.io/styleguide/go/decisions
---
> Check, return, or explicitly document every error; never discard one silently.

## Why

An ignored error is a silent failure: the create can fail and every later write goes nowhere. The style guide allows discarding a result only when the method documents that it cannot fail (as `bytes.Buffer.Write` does) and requires a comment saying why. If the program cannot continue after the failure, the error is fatal and must be handled as such, not dropped.

## Bad

```go
func save(path string, data []byte) {
    f, _ := os.Create(path)
    f.Write(data)
    f.Close()
}
```

## Good

```go
func save(path string, data []byte) error {
    f, err := os.Create(path)
    if err != nil {
        return fmt.Errorf("create %s: %w", path, err)
    }
    var errs []error
    if _, err := f.Write(data); err != nil {
        errs = append(errs, fmt.Errorf("write %s: %w", path, err))
    }
    if err := f.Close(); err != nil {
        errs = append(errs, fmt.Errorf("close %s: %w", path, err))
    }
    return errors.Join(errs...)
}
```

## See Also

- [go-err-join](err-join.md) - when cleanup must fail alongside the primary error
- [go-err-log-once](err-log-once.md) - where an error that cannot be returned is logged
