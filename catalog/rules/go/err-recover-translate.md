---
id: go-err-recover-translate
lang: go
prefix: err
title: Recover only your own package's panic and translate it at the boundary, re-panicking the rest
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [recover, panic, defer, boundary]
  files: ["**/*.go"]
  symbols: [recover]
related: [go-err-panic-programmer-error, go-err-log-once]
sources:
  - title: Google Go Style Best Practices - When to panic
    url: https://google.github.io/styleguide/go/best-practices
  - title: Effective Go - Recover
    url: https://go.dev/doc/effective_go
---
> Recover only panics your package raises, convert them to errors at the public boundary, and re-panic anything else.

## Why

A blanket recover turns corrupted program state into a silent success and buries the bug. The style guide permits panic as an internal implementation detail only when a matching recover at the package boundary translates the package's own panic type into an error; panics never escape across package boundaries. Recovering a panic you do not understand discards the stack trace that would have fixed it.

## Bad

```go
type Node struct{ Kind string }

func parse(input string) *Node { return &Node{Kind: "root"} }

func Parse(input string) (*Node, error) {
    defer func() {
        if r := recover(); r != nil {
            slog.Warn("recovered panic", "panic", r)
        }
    }()
    return parse(input), nil
}
```

## Good

```go
type Node struct{ Kind string }

type syntaxError struct{ msg string }

func Parse(input string) (_ *Node, err error) {
    defer func() {
        if p := recover(); p != nil {
            se, ok := p.(*syntaxError)
            if !ok {
                panic(p)
            }
            err = fmt.Errorf("parse: %v", se.msg)
        }
    }()
    return &Node{Kind: "root"}, nil
}
```

## See Also

- [go-err-panic-programmer-error](err-panic-programmer-error.md) - which panics are legitimate to raise
- [go-err-log-once](err-log-once.md) - the recovered error is logged once, where it is handled
