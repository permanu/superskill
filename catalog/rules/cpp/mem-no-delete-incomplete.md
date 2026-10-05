---
id: cpp-mem-no-delete-incomplete
lang: cpp
prefix: mem
title: Never delete through an incomplete type
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [incomplete-type, delete, pimpl, lifetime]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [delete]
related: [cpp-api-pimpl, cpp-mem-matched-alloc-free]
sources:
  - title: cppreference - delete expression
    url: https://en.cppreference.com/w/cpp/language/delete
  - title: cppreference - PImpl
    url: https://en.cppreference.com/w/cpp/language/pimpl
---
> Delete only where the complete type is visible so the destructor and deallocator are known.

## Why

Deleting a pointer whose class type is incomplete is undefined behavior when the complete class has a non-trivial destructor or a deallocation function, and newer language rules make it ill-formed. The compiler cannot call a destructor it has not seen or pick the right deallocation function, so the delete silently skips the cleanup the type expected. The pimpl idiom handles this by defining the destructor out-of-line, where the implementation type is complete.

## Bad

```cpp
struct Payload; // incomplete

void destroy(Payload* payload) {
    delete payload; // destructor and size unknown: undefined behavior
}
```

## Good

```cpp
struct Payload {
    ~Payload(); // defined where the complete type is visible
};

void destroy(Payload* payload) {
    delete payload; // complete type: destructor and deallocation are known
}
```

## See Also

- [cpp-api-pimpl](api-pimpl.md) - the pattern that keeps the destructor out-of-line
- [cpp-mem-matched-alloc-free](mem-matched-alloc-free.md) - selecting the matching deallocation form
