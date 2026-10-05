---
id: cpp-api-avoid-globals
lang: cpp
prefix: api
title: Avoid non-const global variables; pass state as parameters
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [global, state, parameter, coupling]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-api-avoid-singletons, cpp-api-preconditions]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Do not expose mutable global state; make every dependency an explicit parameter.

## Why

A non-const global can be read and written by any function at any time, so no function's behavior is determined by its arguments alone. Tests must reset the global, order of calls changes results, and two components silently couple through it. Passing state as a parameter makes the dependency visible in the signature and lets each caller hold its own instance.

## Bad

```cpp
// Bad: every function can read and write the configuration.
int retry_count = 3;

int retries() {
    return retry_count;
}
```

## Good

```cpp
struct Config {
    int retry_count = 3;
};

int retries(const Config& config) {
    return config.retry_count; // dependency is explicit
}
```

## See Also

- [cpp-api-avoid-singletons](api-avoid-singletons.md) - the single-instance version of the same problem
- [cpp-api-preconditions](api-preconditions.md) - stating what a function needs from its inputs
