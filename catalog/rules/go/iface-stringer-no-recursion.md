---
id: go-iface-stringer-no-recursion
lang: go
prefix: iface
title: Implement String by formatting the underlying value, never the receiver itself
severity: must
enforce: tool
tool: go vet:printf
baseline: latest
status: verified
triggers:
  keywords: [Stringer, String method, recursion, fmt]
  files: ["**/*.go"]
  symbols: [String]
related: [go-iface-canonical-name, go-iface-receivers-consistent]
sources:
  - title: Effective Go - Printing
    url: https://go.dev/doc/effective_go
  - title: Google Go Style Decisions - Named result parameters
    url: https://google.github.io/styleguide/go/decisions
---
> Convert to the base type inside String(); passing the receiver to Sprintf recurses forever.

## Why

fmt calls the String method to format a value, so a String method that passes its receiver back to Sprintf calls itself again until the stack overflows. Effective Go shows the fix: convert to the underlying basic type, which has no String method, before formatting. The recursion is invisible at the call site, and the vet printf analyzer reports the recursive call, which is why the conversion has to be part of the method itself.

## Bad

```go
type MyString string

func (m MyString) String() string {
    return fmt.Sprintf("MyString=%s", m)
}
```

## Good

```go
type MyString string

func (m MyString) String() string {
    return fmt.Sprintf("MyString=%s", string(m))
}
```

## See Also

- [go-iface-canonical-name](iface-canonical-name.md) - why the method is called String
- [go-iface-receivers-consistent](iface-receivers-consistent.md) - choosing the receiver kind for String
