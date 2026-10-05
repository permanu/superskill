---
id: go-type-uintptr-not-pointer
lang: go
prefix: type
title: Store unsafe.Pointer, not uintptr, when the value must stay a pointer
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unsafe, uintptr, unsafe.Pointer, garbage collector]
  files: ["**/*.go"]
  symbols: [unsafe.Pointer, uintptr]
related: [go-type-definition-over-alias, go-type-make-for-reference]
sources:
  - title: Package unsafe - Pointer
    url: https://pkg.go.dev/unsafe
  - title: The Go Programming Language Specification - Package unsafe
    url: https://go.dev/ref/spec
---
> A uintptr is an integer with no pointer semantics; it keeps nothing alive.

## Why

The unsafe documentation states that a uintptr is an integer, not a reference, that converting a Pointer to a uintptr creates a value with no pointer semantics, and that the garbage collector will neither update the uintptr nor keep the object from being reclaimed. It adds that converting a uintptr back to Pointer is not valid in general, and the specification calls the effect of converting between Pointer and uintptr implementation-defined. A field that must keep an object alive or hand it back to the runtime should hold unsafe.Pointer rather than the integer address.

## Bad

```go
import "unsafe"

type Handle struct {
    addr uintptr
}

var _ = Handle{addr: uintptr(unsafe.Pointer(new(int)))}
```

## Good

```go
import "unsafe"

type Handle struct {
    ptr unsafe.Pointer
}
```

## See Also

- [go-type-definition-over-alias](type-definition-over-alias.md) - the type identity that makes uintptr and Pointer different
- [go-type-make-for-reference](type-make-for-reference.md) - the reference types whose headers keep pointers
