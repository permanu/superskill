---
id: go-pat-method-values
lang: go
prefix: pat
title: Pass method values instead of wrapping closures
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [method value, callback, closure, receiver]
  files: ["**/*.go"]
  symbols: []
related: [go-pat-func-adapters, go-conv-short-var-decl]
sources:
  - title: The Go Programming Language Specification - Method values
    url: https://go.dev/ref/spec
  - title: The Go Programming Language Specification - Method expressions
    url: https://go.dev/ref/spec
---
> x.M binds the receiver at evaluation time and drops the wrapper closure.

## Why

The specification says x.M is a method value, a function value callable with the same arguments as a method call, with the receiver evaluated and saved at that point. Wrapping it in a closure repeats the signature and can accidentally capture a different variable. The method value states the binding directly and is checked by the compiler.

## Bad

```go
type Server struct{}

func (s *Server) handle(msg string) {}

func register(f func(string)) {}

func setup(s *Server) {
    register(func(msg string) { s.handle(msg) })
}
```

## Good

```go
type Server struct{}

func (s *Server) handle(msg string) {}

func register(f func(string)) {}

func setup(s *Server) {
    register(s.handle)
}
```

## See Also

- [go-pat-func-adapters](pat-func-adapters.md) - adapting a function to an interface
- [go-conv-short-var-decl](conv-short-var-decl.md) - the declaration style that keeps this readable
