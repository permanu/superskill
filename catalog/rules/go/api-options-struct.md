---
id: go-api-options-struct
lang: go
prefix: api
title: Group long argument lists into an option struct
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [options, parameters, API design, struct]
  files: ["**/*.go"]
  symbols: [Options]
related: [go-api-constructors-new, go-api-option-defaults]
sources:
  - title: Google Go Style Best Practices - Option structure
    url: https://google.github.io/styleguide/go/best-practices
  - title: Google Go Style Decisions - Function formatting
    url: https://google.github.io/styleguide/go/decisions
---
> Collect many inputs into an exported option struct passed as the last argument.

## Why

Positional arguments of the same or boolean type are easy to swap silently, and every new option breaks all call sites. The best-practices option structure makes calls self-documenting because each value carries its field name, lets default fields be omitted, and grows without touching callers. It also gives each field a place for its own documentation.

## Bad

```go
type Server struct {
    addr    string
    port    int
    tls     bool
    timeout time.Duration
    retries int
}

func NewServer(addr string, port int, tls bool, timeout time.Duration, retries int) *Server {
    return &Server{addr: addr, port: port, tls: tls, timeout: timeout, retries: retries}
}
```

## Good

```go
type Server struct{ opts Options }

type Options struct {
    Addr    string
    Port    int
    TLS     bool
    Timeout time.Duration
    Retries int
}

func NewServer(opts Options) *Server { return &Server{opts: opts} }
```

## See Also

- [go-api-constructors-new](api-constructors-new.md) - constructors that take the options
- [go-api-option-defaults](api-option-defaults.md) - documenting each field's default
