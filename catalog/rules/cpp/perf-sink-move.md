---
id: cpp-perf-sink-move
lang: cpp
prefix: perf
title: Move will-move-from parameters into their destination
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sink, move, parameter, constructor]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::move]
related: [cpp-perf-no-return-move, cpp-raii-move-valid-source]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Move constructors
    url: https://en.cppreference.com/w/cpp/language/move_constructor
---
> Take a parameter that will be stored as X&& and std::move it into the member.

## Why

A constructor that copies its argument pays for a full copy even when the caller passes a temporary that will never be used again. Taking the parameter by rvalue reference and moving it transfers the internal buffer instead of duplicating it, and the move is explicit at the point where ownership changes. Copying remains possible at the call site by passing an lvalue only where the type offers it; the sink contract is visible in the signature.

## Bad

```cpp
#include <string>

class User {
public:
    explicit User(const std::string& name) : name_(name) {} // copies
private:
    std::string name_;
};
```

## Good

```cpp
#include <string>
#include <utility>

class User {
public:
    explicit User(std::string&& name) : name_(std::move(name)) {} // moves
private:
    std::string name_;
};
```

## See Also

- [cpp-perf-no-return-move](perf-no-return-move.md) - the return side of move discipline
- [cpp-raii-move-valid-source](raii-move-valid-source.md) - the state a moved-from parameter keeps
