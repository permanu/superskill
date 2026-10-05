---
id: cpp-api-return-struct
lang: cpp
prefix: api
title: Return multiple values as a struct or tuple instead of through output parameters
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [return, struct, tuple, out-parameter, multiple-values]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::tuple]
related: [cpp-raii-return-by-value, cpp-api-few-arguments]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::tuple
    url: https://en.cppreference.com/w/cpp/utility/tuple
---
> Return several values as one aggregate; do not fill caller-supplied output parameters.

## Why

Output parameters split a result across the argument list, so the caller must declare each one first and can read a half-filled value after a failure. A returned struct or tuple carries the values as one object: it cannot be partially read, it works with structured bindings, and it leaves the parameter list free for real inputs. Return-value optimization makes the aggregate as cheap as the out-parameters.

## Bad

```cpp
#include <string>

// Bad: caller declares two outputs and must check code before trusting message.
void query(int id, int& code, std::string& message);
```

## Good

```cpp
#include <string>

struct QueryResult {
    int code;
    std::string message;
};

QueryResult query(int id);

int main() {
    const auto [code, message] = query(7); // one object, bound at once
    return code;
}
```

## See Also

- [cpp-raii-return-by-value](raii-return-by-value.md) - the resource-handle case
- [cpp-api-few-arguments](api-few-arguments.md) - grouping inputs the same way
