---
id: cpp-api-default-args
lang: cpp
prefix: api
title: Where there is a choice, prefer default arguments over overload sets
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [default-arguments, overloads, api-surface]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-api-few-arguments, cpp-api-return-struct]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Express optional parameters as defaults on one function, not as a family of overloads.

## Why

An overload set that differs only in trailing parameters multiplies the API surface: each overload must be declared, documented, and kept consistent, and overload resolution decides which one runs. A single function with default arguments states the optionality directly, and the defaults are visible at one place. Reserve overloads for genuinely different operations or types.

## Bad

```cpp
// Bad: three declarations for one operation.
void connect(const char* host);
void connect(const char* host, int port);
void connect(const char* host, int port, int timeout_seconds);
```

## Good

```cpp
// One declaration; callers supply only what they need.
void connect(const char* host, int port = 8080, int timeout_seconds = 30);
```

## See Also

- [cpp-api-few-arguments](api-few-arguments.md) - grouping parameters when the list grows
- [cpp-api-return-struct](api-return-struct.md) - avoiding parameter lists that carry results
