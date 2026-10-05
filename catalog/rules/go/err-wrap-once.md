---
id: go-err-wrap-once
lang: go
prefix: err
title: Add context once and never repeat what the underlying error already says
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error, wrap, context, message, duplicate]
  files: ["**/*.go"]
  symbols: [fmt.Errorf]
related: [go-err-wrap-with-w, go-err-log-once]
sources:
  - title: Google Go Style Best Practices - Adding information to errors
    url: https://google.github.io/styleguide/go/best-practices
  - title: Working with Errors in Go 1.13
    url: https://go.dev/blog/go1.13-errors
---
> Add context once per error and never repeat information the inner error already carries.

## Why

An annotation exists to add what the caller cannot already see; repeating the path or operation that the inner error reports produces chains like "load config: open app.yaml: open app.yaml: no such file or directory". The innermost error owns the detail, and each outer layer adds only the meaning of its own step. One layer of context per error keeps the message readable and the chain short.

## Bad

```go
func loadConfig(name string) ([]byte, error) {
    data, err := os.ReadFile(name)
    if err != nil {
        return nil, fmt.Errorf("load config: could not open %s: %w", name, err)
    }
    return data, nil
}

func run() error {
    data, err := loadConfig("app.yaml")
    if err != nil {
        return fmt.Errorf("could not open app.yaml: %w", err)
    }
    _ = data
    return nil
}
```

## Good

```go
func loadConfig(name string) ([]byte, error) {
    data, err := os.ReadFile(name)
    if err != nil {
        return nil, fmt.Errorf("load config: %w", err)
    }
    return data, nil
}

func run() error {
    data, err := loadConfig("app.yaml")
    if err != nil {
        return err
    }
    _ = data
    return nil
}
```

## See Also

- [go-err-wrap-with-w](err-wrap-with-w.md) - the chain that must stay intact
- [go-err-log-once](err-log-once.md) - the same discipline applied to logging
