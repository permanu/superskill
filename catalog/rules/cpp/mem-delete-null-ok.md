---
id: cpp-mem-delete-null-ok
lang: cpp
prefix: mem
title: Do not guard delete with a null check; deleting null does nothing
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [delete, "null", check, cleanup]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [delete]
related: [cpp-mem-matched-alloc-free, cpp-raii-wrap-resources]
sources:
  - title: cppreference - delete expression
    url: https://en.cppreference.com/w/cpp/language/delete
---
> Delete without a null check; a null pointer makes the delete expression a no-op.

## Why

If the operand is a null pointer, no destructor is called and the default deallocation functions are guaranteed to do nothing. A surrounding `if (pointer != nullptr)` adds a branch that always behaves the same as the plain delete, and it suggests the pointer is special when it is not. The only real cleanup question is ownership, which RAII answers better than any guard.

## Bad

```cpp
#include <cstddef>

void release(int* values) {
    if (values != nullptr) // redundant: delete handles null
        delete values;
}
```

## Good

```cpp
void release(int* values) {
    delete values; // no-op when values is null
}
```

## See Also

- [cpp-mem-matched-alloc-free](mem-matched-alloc-free.md) - deleting with the form that matches the allocation
- [cpp-raii-wrap-resources](raii-wrap-resources.md) - removing manual release altogether
