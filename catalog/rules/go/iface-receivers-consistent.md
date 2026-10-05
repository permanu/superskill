---
id: go-iface-receivers-consistent
lang: go
prefix: iface
title: Choose one receiver kind per type; pointer receivers mean only *T satisfies interfaces
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [receiver, pointer, method set, interface satisfaction]
  files: ["**/*.go"]
  symbols: [interface]
related: [go-iface-compile-assert, go-iface-consumer-defined]
sources:
  - title: Go Code Review Comments - Receiver Type
    url: https://go.dev/wiki/CodeReviewComments
  - title: Go FAQ - How can I guarantee my type satisfies an interface?
    url: https://go.dev/doc/faq
---
> Use pointer receivers consistently when any method mutates or holds a lock.

## Why

Mixing value and pointer receivers gives a type two method sets: interface satisfaction depends on which one is passed, and a value-receiver method mutates a copy. The review guide says to pick pointers or values for all methods and to use a pointer when the receiver contains a mutex or must be mutated. Inconsistency surfaces as a compile error at the interface assertion, far from the mutation that caused it.

## Bad

```go
type Counter struct{ n int }

func (c Counter) Get() int { return c.n }
func (c *Counter) Inc()    { c.n++ }
```

## Good

```go
type Counter struct{ n int }

func (c *Counter) Get() int { return c.n }
func (c *Counter) Inc()     { c.n++ }
```

## See Also

- [go-iface-compile-assert](iface-compile-assert.md) - catching method-set mistakes at compile time
- [go-iface-consumer-defined](iface-consumer-defined.md) - interfaces that depend on the method set
