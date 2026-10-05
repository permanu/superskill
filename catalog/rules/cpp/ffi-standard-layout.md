---
id: cpp-ffi-standard-layout
lang: cpp
prefix: ffi
title: Types that cross the boundary must be standard-layout
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [standard-layout, vtable, c-struct, layout]
  files: ["**/*.hpp", "**/*.h", "**/*.cpp"]
  symbols: []
related: [cpp-ffi-trivial-copyable, cpp-ffi-size-assert]
sources:
  - title: cppreference - StandardLayoutType
    url: https://en.cppreference.com/w/cpp/named_req/StandardLayoutType
  - title: cppreference - TriviallyCopyable
    url: https://en.cppreference.com/w/cpp/named_req/TriviallyCopyable
---
> A vtable pointer or mixed access makes the layout stop matching the C mirror.

## Why

The StandardLayoutType reference says what the category is for: standard layout types are useful for communicating with code written in other programming languages. The requirements exist so that the type's layout matches a struct of the same members in C. A class with virtual functions is not standard-layout — it carries a vtable pointer the C side knows nothing about — and mixed access specifiers change the layout guarantees too. Structs shared across the boundary are plain data with one access level and no virtuals.

## Bad

```cpp
struct Widget {
    int id;
    virtual ~Widget() = default; // vptr: layout differs from any C struct
};

int main() {
    return sizeof(Widget) >= sizeof(int) ? 0 : 1;
}
```

## Good

```cpp
struct Widget { // standard-layout: mirrors a C struct
    int id;
};

int main() {
    return sizeof(Widget) == sizeof(int) ? 0 : 1;
}
```

## See Also

- [cpp-ffi-trivial-copyable](ffi-trivial-copyable.md) - the byte-copy half of the requirement
- [cpp-ffi-size-assert](ffi-size-assert.md) - pinning the layout in the build
