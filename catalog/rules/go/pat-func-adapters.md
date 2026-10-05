---
id: go-pat-func-adapters
lang: go
prefix: pat
title: Adapt plain functions with a named function type
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [HandlerFunc, adapter, function type, interface]
  files: ["**/*.go"]
  symbols: []
related: [go-pat-method-values, go-iface-accept-narrow]
sources:
  - title: Package net/http - HandlerFunc
    url: https://pkg.go.dev/net/http
  - title: Effective Go - Interfaces and other types
    url: https://go.dev/doc/effective_go
---
> A one-method interface plus a func type turns any function into a value.

## Why

The net/http documentation calls HandlerFunc an adapter that allows ordinary functions to be used as HTTP handlers, and the pattern generalizes: a named function type with one method implements the interface. The struct wrapper stores the same function behind an extra field and constructor. The named function type also accepts any matching function through a conversion.

## Bad

```go
type Logger interface{ Log(string) }

type logAdapter struct{ fn func(string) }

func (l logAdapter) Log(s string) { l.fn(s) }
```

## Good

```go
type Logger interface{ Log(string) }

type LoggerFunc func(string)

func (f LoggerFunc) Log(s string) { f(s) }
```

## See Also

- [go-pat-method-values](pat-method-values.md) - binding a receiver into the function value
- [go-iface-accept-narrow](iface-accept-narrow.md) - keeping the adapted interface small
