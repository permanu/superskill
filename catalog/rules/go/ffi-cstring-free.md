---
id: go-ffi-cstring-free
lang: go
prefix: ffi
title: Free every C.CString buffer with C.free
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [C.CString, C.free, cgo, leak]
  files: ["**/*.go"]
  symbols: []
related: [go-ffi-passing-pointers, go-err-no-ignore]
sources:
  - title: cmd/cgo - Go references to C
    url: https://pkg.go.dev/cmd/cgo
  - title: Package unsafe - Pointer
    url: https://pkg.go.dev/unsafe
---
> C.CString mallocs; without C.free every call leaks C heap.

## Why

The cgo documentation says CString allocates the C string in the C heap using malloc and that it is the caller's responsibility to arrange for it to be freed, such as by calling C.free. A converted string that outlives the call without a free leaks once per invocation. Deferring C.free(unsafe.Pointer(cs)) immediately after the conversion keeps the pairing visible on every return path.

## Bad

```go
// #include <stdlib.h>
import "C"

func Convert(s string) string {
    cs := C.CString(s)
    return C.GoString(cs)
}
```

## Good

```go
// #include <stdlib.h>
import "C"
import "unsafe"

func Convert(s string) string {
    cs := C.CString(s)
    defer C.free(unsafe.Pointer(cs))
    return C.GoString(cs)
}
```

## See Also

- [go-ffi-passing-pointers](ffi-passing-pointers.md) - what C may keep after the call
- [go-err-no-ignore](err-no-ignore.md) - the general discipline this specializes
