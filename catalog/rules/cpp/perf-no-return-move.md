---
id: cpp-perf-no-return-move
lang: cpp
prefix: perf
title: Do not write return std::move(local); it disables return value optimization
severity: should
enforce: both
tool: clang:-Wpessimizing-move
baseline: latest
status: verified
triggers:
  keywords: [return, move, nrvo, copy-elision]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::move]
related: [cpp-raii-move-valid-source, cpp-perf-sink-move]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Copy elision
    url: https://en.cppreference.com/w/cpp/language/copy_elision
---
> Return the local by name; std::move on a return operand is always a pessimization.

## Why

Returning a local variable moves it implicitly, and when copy elision applies the move is elided entirely. Wrapping the operand in `std::move` makes it an rvalue expression that no longer qualifies for named return value optimization, so the compiler must move instead of constructing the result in place. The explicit move therefore costs work in exactly the case where the optimization would have removed all of it.

## Bad

```cpp
#include <string>

std::string build() {
    std::string result = "value";
    return std::move(result); // defeats NRVO: forces a move
}
```

## Good

```cpp
#include <string>

std::string build() {
    std::string result = "value";
    return result; // implicitly moved; NRVO can construct in place
}
```

## See Also

- [cpp-raii-move-valid-source](raii-move-valid-source.md) - what a move must leave behind
- [cpp-perf-sink-move](perf-sink-move.md) - moving parameters into members
