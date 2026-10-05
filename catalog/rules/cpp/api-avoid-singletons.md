---
id: cpp-api-avoid-singletons
lang: cpp
prefix: api
title: Avoid singletons; pass the service to the functions that need it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [singleton, global, dependency, service]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-api-avoid-globals, cpp-api-param-passing]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Do not reach for a single global instance; accept the service as a parameter.

## Why

A singleton is a global with a constructor: every caller reaches the same hidden instance, so tests cannot substitute a fake, lifetime is fixed at first use, and initialization order becomes an invisible dependency. Taking the service as a parameter makes the dependency explicit, allows different instances per context, and keeps destruction deterministic.

## Bad

```cpp
struct Logger {
    static Logger& instance() {
        static Logger logger;
        return logger;
    }
    void write(const char* message);
};

void run() {
    Logger::instance().write("started"); // hidden global dependency
}
```

## Good

```cpp
struct Logger {
    void write(const char* message);
};

void run(Logger& logger) {
    logger.write("started"); // dependency is visible and replaceable
}
```

## See Also

- [cpp-api-avoid-globals](api-avoid-globals.md) - the general rule this specializes
- [cpp-api-param-passing](api-param-passing.md) - passing services without extra indirection
