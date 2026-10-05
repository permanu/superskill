---
id: go-ffi-passing-pointers
lang: go
prefix: ffi
title: Let C keep a Go pointer only while the memory is pinned
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cgo, Go pointer, pinning, runtime.Pinner]
  files: ["**/*.go"]
  symbols: []
related: [go-ffi-cstring-free, go-type-uintptr-not-pointer]
sources:
  - title: cmd/cgo - Passing pointers
    url: https://pkg.go.dev/cmd/cgo
  - title: Package runtime - Pinner
    url: https://pkg.go.dev/runtime
---
> C may not retain a Go pointer after the call unless memory is pinned.

## Why

The cgo documentation says C code may not keep a copy of a Go pointer after the call returns unless the memory it points to is pinned with runtime.Pinner and the Pinner is not unpinned while C stores it. It adds that strings, slices, and channels cannot be pinned, so C may never retain them at all. Keeping C's references inside the call, or pinning explicitly for longer, keeps the collector free to move memory.

## Bad

```go
// #include <stdlib.h>
// static int *saved;
// static void store_go_pointer(int *p) { saved = p; }
import "C"
import "unsafe"

// Store hands C a Go pointer that C keeps after the call returns.
func Store(v *int) {
    C.store_go_pointer((*C.int)(unsafe.Pointer(v)))
}
```

## Good

```go
// #include <stdlib.h>
// static int *saved;
// static void store_go_pointer(int *p) { saved = p; }
import "C"
import (
    "runtime"
    "unsafe"
)

// Registry keeps its Pinner alive while C holds the pointer.
type Registry struct {
    pinner runtime.Pinner
}

func (r *Registry) Store(v *int) {
    r.pinner.Pin(v)
    C.store_go_pointer((*C.int)(unsafe.Pointer(v)))
}

func (r *Registry) Close() { r.pinner.Unpin() }
```

## See Also

- [go-ffi-cstring-free](ffi-cstring-free.md) - managing the memory C allocates instead
- [go-type-uintptr-not-pointer](type-uintptr-not-pointer.md) - keeping references as pointers, not integers
