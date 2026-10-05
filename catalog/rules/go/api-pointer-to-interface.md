---
id: go-api-pointer-to-interface
lang: go
prefix: api
title: Pass interface values directly instead of pointers to interfaces
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interface, pointer, parameters, io.Writer]
  files: ["**/*.go"]
  symbols: [io.Writer]
related: [go-iface-accept-narrow, go-api-options-struct]
sources:
  - title: Go FAQ - When should I use a pointer to an interface?
    url: https://go.dev/doc/faq
  - title: Package io
    url: https://pkg.go.dev/io
---
> Take the interface itself; a pointer to an interface is almost never what you want.

## Why

An interface value is already a two-word descriptor, so a pointer to it adds indirection and forces callers to take the address of a variable. The FAQ answers "almost never" to pointers to interfaces, and every io function takes io.Writer or io.Reader directly. Keeping the interface value also keeps its full method set available through the parameter.

## Bad

```go
func WriteAll(w *io.Writer, data []byte) error {
    _, err := (*w).Write(data)
    return err
}
```

## Good

```go
func WriteAll(w io.Writer, data []byte) error {
    _, err := w.Write(data)
    return err
}
```

## See Also

- [go-iface-accept-narrow](iface-accept-narrow.md) - choosing the interface for the parameter
- [go-api-options-struct](api-options-struct.md) - grouping parameters when there are many
