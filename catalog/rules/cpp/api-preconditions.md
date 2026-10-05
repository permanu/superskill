---
id: cpp-api-preconditions
lang: cpp
prefix: api
title: State and check preconditions instead of assuming callers got them right
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [precondition, assert, contract, inputs]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [assert]
related: [cpp-api-avoid-globals, cpp-type-parse-at-boundary]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Document what the function requires and assert it, so violations fail at the call that caused them.

## Why

An undocumented precondition, such as a non-null pointer or a positive size, becomes an assumption the implementation makes silently; when a caller violates it, the failure appears far from the cause as a crash or wrong result. Stating the requirement and checking it with `assert` in debug builds turns the violation into a precise, local failure without paying cost in release builds.

## Bad

```cpp
#include <cstddef>

// Bad: the precondition (values != nullptr, size > 0) is undocumented and unchecked.
int first_value(const int* values, std::size_t size) {
    return values[0];
}
```

## Good

```cpp
#include <cassert>
#include <cstddef>

int first_value(const int* values, std::size_t size) {
    assert(values != nullptr && size > 0); // precondition, checked in debug builds
    return values[0];
}
```

## See Also

- [cpp-api-avoid-globals](api-avoid-globals.md) - preconditions are the dependencies of a function
- [cpp-type-parse-at-boundary](type-parse-at-boundary.md) - eliminating preconditions by validating input once
