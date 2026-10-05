---
id: cpp-raii-return-by-value
lang: cpp
prefix: raii
title: Return resource handles by value instead of writing them through output parameters
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [return-value, out-parameter, factory, ownership]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::unique_ptr]
related: [cpp-raii-param-ownership, cpp-raii-raw-non-owning]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::unique_ptr
    url: https://en.cppreference.com/w/cpp/memory/unique_ptr
---
> Return ownership from factories and transfers; do not fill caller-supplied handle parameters.

## Why

An output parameter splits the result across two channels: the caller must pre-declare the handle and remember to inspect the returned status, and nothing prevents using a half-filled parameter after a failure. Returning the handle by value keeps ownership in the return type; move semantics and guaranteed copy elision make it as cheap as the out-parameter, and the object cannot be used before it exists.

## Bad

```cpp
#include <memory>
#include <string>

struct Connection { };

bool connect(const std::string& host, std::unique_ptr<Connection>& out) {
    out = std::make_unique<Connection>();
    return true;
}
```

## Good

```cpp
#include <memory>
#include <string>

struct Connection { };

std::unique_ptr<Connection> connect(const std::string& host) {
    return std::make_unique<Connection>();
}
```

## See Also

- [cpp-raii-param-ownership](raii-param-ownership.md) - the input side of the same convention
- [cpp-raii-raw-non-owning](raii-raw-non-owning.md) - why raw out-parameters obscure ownership
