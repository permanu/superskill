---
id: cpp-err-noexcept-truthful
lang: cpp
prefix: err
title: Mark a function noexcept only when no exception can escape it; a false noexcept terminates
severity: must
enforce: both
tool: clang-tidy:bugprone-exception-escape
baseline: latest
status: verified
triggers:
  keywords: [noexcept, terminate, contract, exception]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [noexcept]
related: [cpp-err-dtor-noexcept, cpp-err-no-throw-across-c]
sources:
  - title: cppreference - noexcept specifier
    url: https://en.cppreference.com/w/cpp/language/noexcept_spec
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Declare noexcept only when the function cannot exit by exception; otherwise an escape calls std::terminate.

## Why

`noexcept` is a promise the compiler exploits: containers choose moving over copying based on it, and callers skip handlers. When a throw reaches the outermost block of a non-throwing function, `std::terminate` is called, so a false promise converts a recoverable error into a crash and loses the ability to catch it. Mark functions noexcept only when every called operation is non-throwing, or when termination is the intended degradation.

## Bad

```cpp
#include <vector>

// Bad: vector growth can throw std::bad_alloc; this promises it cannot.
void append(std::vector<int>& target, const std::vector<int>& src) noexcept {
    target.insert(target.end(), src.begin(), src.end());
}
```

## Good

```cpp
#include <cstddef>
#include <vector>

// Growth can throw, so the function is not noexcept.
void append(std::vector<int>& target, const std::vector<int>& src) {
    target.insert(target.end(), src.begin(), src.end());
}

// No throwing operation can escape, so noexcept is accurate.
std::size_t size_of(const std::vector<int>& values) noexcept {
    return values.size();
}
```

## See Also

- [cpp-err-dtor-noexcept](err-dtor-noexcept.md) - destructors and moves must be actually non-throwing
- [cpp-err-no-throw-across-c](err-no-throw-across-c.md) - the boundary where noexcept plus catch enforces the contract
