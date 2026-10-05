---
id: cpp-err-throw-by-value
lang: cpp
prefix: err
title: Throw exception objects by value; never throw raw pointers or stack objects by address
severity: must
enforce: both
tool: clang-tidy:misc-throw-by-value-catch-by-reference
baseline: latest
status: verified
triggers:
  keywords: [throw, pointer, ownership, exception]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [throw]
related: [cpp-err-catch-by-reference]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: isocpp.org FAQ - Exceptions and Error Handling
    url: https://isocpp.org/wiki/faq/exceptions
---
> Throw exception objects by value; the runtime stores its own copy and deletes it.

## Why

Throwing by value copies the temporary into runtime-owned storage, so the exception outlives the throw site and no caller owns a pointer. Throwing `new` transfers ownership into a form the language will not release: every handler must catch by pointer and delete it, and a miss leaks. Throwing a pointer to a local object or rethrowing with `throw e;` instead of `throw;` loses the original or dangles.

## Bad

```cpp
#include <stdexcept>

class ConfigError : public std::runtime_error {
public:
    ConfigError() : std::runtime_error("bad config") {}
};

void load() {
    throw new ConfigError(); // heap allocation nobody owns
}

int main() {
    load();
}
```

## Good

```cpp
#include <stdexcept>

class ConfigError : public std::runtime_error {
public:
    ConfigError() : std::runtime_error("bad config") {}
};

void load() {
    throw ConfigError{}; // copied into runtime-owned storage
}

int main() {
    load();
}
```

## See Also

- [cpp-err-catch-by-reference](err-catch-by-reference.md) - handlers bind to the thrown object by reference
