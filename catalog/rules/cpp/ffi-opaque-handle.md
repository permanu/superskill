---
id: cpp-ffi-opaque-handle
lang: cpp
prefix: ffi
title: Hand C an opaque pointer, not the object layout
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [opaque, handle, abi, pimpl]
  files: ["**/*.hpp", "**/*.h", "**/*.cpp"]
  symbols: []
related: [cpp-ffi-standard-layout, cpp-api-pimpl]
sources:
  - title: cppreference - PImpl
    url: https://en.cppreference.com/w/cpp/language/pimpl
  - title: cppreference - Language linkage
    url: https://en.cppreference.com/w/cpp/language/language_linkage
---
> The C side needs a handle to hold, not fields to depend on.

## Why

The pimpl reference describes the pattern as separating the interface from the implementation, so changes to the implementation do not force users to recompile and the binary interface stays stable. Across a C boundary the same idea is stronger: a fully declared struct makes every C caller depend on field order, types, and size, so any internal change is an ABI break. An incomplete struct behind a pointer gives the C side a handle it can store and pass back; the layout lives entirely in the C++ translation units.

## Bad

```cpp
struct Widget { // internals exposed across the C boundary
    int id;
    int flags;
};

extern "C" Widget* widget_new();

int main() {
    return 0;
}
```

## Good

```cpp
struct Widget; // opaque: C callers hold only the handle

extern "C" Widget* widget_new();
extern "C" void widget_free(Widget* widget);

int main() {
    return 0;
}
```

## See Also

- [cpp-ffi-standard-layout](ffi-standard-layout.md) - when the fields really must be public
- [cpp-api-pimpl](api-pimpl.md) - the same pattern inside C++
