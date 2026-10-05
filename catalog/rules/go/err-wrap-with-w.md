---
id: go-err-wrap-with-w
lang: go
prefix: err
title: Wrap errors with %w to add context without breaking the chain
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error, wrap, fmt.Errorf, "%w", errors.Is]
  files: ["**/*.go"]
  symbols: [fmt.Errorf]
related: [go-err-match-by-is-as, go-err-wrap-once, go-err-contract-minimal]
sources:
  - title: Working with Errors in Go 1.13
    url: https://go.dev/blog/go1.13-errors
  - title: Google Go Style Best Practices - Error handling
    url: https://google.github.io/styleguide/go/best-practices
---
> Wrap an error with `%w` when callers must inspect it; use `%v` only to hide an implementation detail.

## Why

`fmt.Errorf` with `%v` keeps the text but destroys the chain, so callers can no longer branch on the cause. With `%w` the returned error unwraps to the original and both the message and the programmatic identity survive. Wrapping is an API decision: the wrapped error becomes inspectable by every caller, so wrap what the package is prepared to support.

## Bad

```go
var ErrKeyMissing = errors.New("key missing")

func readKey(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read key: %v", err)
    }
    return data, nil
}

func loadKey(path string) ([]byte, error) {
    data, err := readKey(path)
    if err != nil {
        if errors.Is(err, os.ErrNotExist) {
            return nil, ErrKeyMissing
        }
        return nil, err
    }
    return data, nil
}
```

## Good

```go
var ErrKeyMissing = errors.New("key missing")

func readKey(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read key: %w", err)
    }
    return data, nil
}

func loadKey(path string) ([]byte, error) {
    data, err := readKey(path)
    if err != nil {
        if errors.Is(err, os.ErrNotExist) {
            return nil, fmt.Errorf("%w: %s", ErrKeyMissing, path)
        }
        return nil, err
    }
    return data, nil
}
```

## See Also

- [go-err-match-by-is-as](err-match-by-is-as.md) - the matching rules that `%w` makes possible
- [go-err-wrap-once](err-wrap-once.md) - how much context each wrap should add
- [go-err-contract-minimal](err-contract-minimal.md) - choosing what the wrapping exposes
