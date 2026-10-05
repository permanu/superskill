---
id: go-iface-accept-narrow
lang: go
prefix: iface
title: Accept the narrowest interface the function actually uses
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interface, parameter, io.Writer, abstraction]
  files: ["**/*.go"]
  symbols: [io.Writer, io.Reader]
related: [go-iface-consumer-defined, go-iface-small-compose, go-iface-optional-capability]
sources:
  - title: Effective Go - Printing
    url: https://go.dev/doc/effective_go
  - title: Go FAQ - Why is there no type inheritance?
    url: https://go.dev/doc/faq
  - title: Package io
    url: https://pkg.go.dev/io
---
> Take the smallest interface the body needs, not a concrete type or a fat one.

## Why

A function that writes output needs io.Writer, not *os.File; narrowing the parameter lets tests pass buffers and lets callers pass files, sockets, or compression writers. The FAQ calls io.Writer's influence profound because a single method connects otherwise separate packages, and Effective Go shows fmt functions accepting any io.Writer. Concrete parameters force callers into one implementation and make tests construct real resources. The same holds for reading: io.Reader covers files, buffers, network connections, and test fixtures, so one helper serves them all.

## Bad

```go
import "os"

func WriteReport(f *os.File, report string) error {
    _, err := f.WriteString(report)
    return err
}
```

## Good

```go
import "io"

func WriteReport(w io.Writer, report string) error {
    _, err := io.WriteString(w, report)
    return err
}
```

## See Also

- [go-iface-consumer-defined](iface-consumer-defined.md) - where the narrow interface lives
- [go-iface-small-compose](iface-small-compose.md) - keeping the interface one or two methods
- [go-iface-optional-capability](iface-optional-capability.md) - asserting for more than the narrow interface
- [go-io-read-all](io-read-all.md) - the helper that consumes the reader this rule recommends
