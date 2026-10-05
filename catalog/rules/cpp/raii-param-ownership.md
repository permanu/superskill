---
id: cpp-raii-param-ownership
lang: cpp
prefix: raii
title: Use smart pointer parameters only to express lifetime semantics; otherwise take T& or T*
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [parameter, ownership, unique_ptr, reference, borrow]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::unique_ptr, std::shared_ptr]
related: [cpp-raii-unique-default, cpp-raii-return-by-value, cpp-raii-raw-non-owning]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::unique_ptr
    url: https://en.cppreference.com/w/cpp/memory/unique_ptr
---
> Let the parameter type state the lifetime role: T& borrows, unique_ptr<T> by value takes ownership.

## Why

A function that only reads an object does not need to own it, yet a smart pointer parameter forces callers to hold that exact ownership type and invites accidental lifetime extension. Passing `unique_ptr<T>` by value means the function consumes the object; passing `T&` or `T*` means it borrows and must not outlive the call. The signature then documents the contract without comments.

## Bad

```cpp
#include <memory>

struct Config {
    int port;
};

int listen(std::shared_ptr<Config> config) { // over-owns; lifetime unclear
    return config->port;
}
```

## Good

```cpp
#include <memory>

struct Config {
    int port;
};

int listen(const Config& config) { // borrows; caller keeps ownership
    return config.port;
}

int take(std::unique_ptr<Config> config) { // consumes ownership
    return config->port;
}
```

## See Also

- [cpp-raii-unique-default](raii-unique-default.md) - choosing the owner type first
- [cpp-raii-return-by-value](raii-return-by-value.md) - handing ownership back out
- [cpp-raii-raw-non-owning](raii-raw-non-owning.md) - raw parameters are non-owning
