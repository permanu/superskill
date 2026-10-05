---
id: cpp-mem-let-new-throw
lang: cpp
prefix: mem
title: Let new throw bad_alloc instead of checking for null or using nothrow new
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [new, bad_alloc, nothrow, "null"]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::bad_alloc, std::nothrow]
related: [cpp-mem-matched-alloc-free, cpp-err-degradation-path]
sources:
  - title: cppreference - new expression
    url: https://en.cppreference.com/w/cpp/language/new
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Use plain new; it throws std::bad_alloc on failure, so no null check belongs at the call site.

## Why

The throwing `new` never returns null: on exhaustion it calls the new-handler and, if that cannot free memory, throws `std::bad_alloc`. Code that checks the result for null is checking a condition that cannot occur, while the real failure path is an exception that the check does not handle. The nothrow form exists for specific embedded or no-exception contexts; everywhere else it just adds a branch that callers will forget.

## Bad

```cpp
#include <cstddef>
#include <new>

int* allocate(int count) {
    int* values = new (std::nothrow) int[count]; // failure now hides in a null
    if (values == nullptr)
        return nullptr;
    return values;
}
```

## Good

```cpp
int* allocate(int count) {
    return new int[count]; // failure throws std::bad_alloc to the caller
}
```

## See Also

- [cpp-mem-matched-alloc-free](mem-matched-alloc-free.md) - pairing the allocation with its deletion
- [cpp-err-degradation-path](err-degradation-path.md) - deliberate failure when exceptions are unavailable
