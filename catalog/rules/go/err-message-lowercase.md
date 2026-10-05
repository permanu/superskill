---
id: go-err-message-lowercase
lang: go
prefix: err
title: Start error strings lowercase and end them without punctuation
severity: should
enforce: tool
tool: staticcheck:ST1005
baseline: latest
status: verified
triggers:
  keywords: [error, message, style, punctuation, capitalization]
  files: ["**/*.go"]
  symbols: [errors.New, fmt.Errorf]
related: [go-err-wrap-with-w, go-err-log-once]
sources:
  - title: Go Code Review Comments - Error Strings
    url: https://go.dev/wiki/CodeReviewComments
  - title: Google Go Style Decisions - Error strings
    url: https://google.github.io/styleguide/go/decisions
---
> Write error strings as lowercase fragments without trailing punctuation.

## Why

Error text is usually embedded after other context, as in "reading config: open app.yaml: no such file or directory", so a capital letter or a period reads wrong mid-sentence. Names that begin with an exported identifier, a proper noun, or an acronym keep their case. Log messages are whole lines and follow sentence style instead.

## Bad

```go
func parsePort(s string) (int, error) {
    n, err := strconv.Atoi(s)
    if err != nil {
        return 0, fmt.Errorf("Invalid port %q.", s)
    }
    return n, nil
}
```

## Good

```go
func parsePort(s string) (int, error) {
    n, err := strconv.Atoi(s)
    if err != nil {
        return 0, fmt.Errorf("invalid port %q: %w", s, err)
    }
    return n, nil
}
```

## See Also

- [go-err-wrap-with-w](err-wrap-with-w.md) - wrapping keeps the text lowercase throughout the chain
- [go-err-log-once](err-log-once.md) - error strings are fragments; log lines are full sentences
