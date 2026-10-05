---
id: go-anti-unchecked-type-assertion
lang: go
prefix: anti
title: Use the comma-ok form of type assertions
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [type assertion, comma ok, panic, any]
  files: ["**/*.go"]
  symbols: []
related: [go-iface-optional-capability, go-anti-context-values]
sources:
  - title: Effective Go - Interface conversions and type assertions
    url: https://go.dev/doc/effective_go
  - title: The Go Programming Language Specification - Type assertions
    url: https://go.dev/ref/spec
---
> The single-value assertion panics; comma-ok turns it into a boolean.

## Why

Effective Go shows that if the value does not contain the asserted type, the program crashes with a run-time error, and recommends the comma, ok idiom to test safely. The failure mode is a panic far from the assertion, triggered by input that reached the function through any path. With comma-ok the mismatch is an ordinary false branch that the author can turn into an error, a default, or a different case.

## Bad

```go
func name(v any) string {
    return v.(string)
}
```

## Good

```go
func name(v any) string {
    s, ok := v.(string)
    if !ok {
        return ""
    }
    return s
}
```

## See Also

- [go-iface-optional-capability](iface-optional-capability.md) - asserting for an optional interface
- [go-anti-context-values](anti-context-values.md) - where unchecked assertions on context values usually hide
