---
id: cpp-err-no-throw-across-c
lang: cpp
prefix: err
title: Never let a C++ exception cross an extern "C" boundary; catch and translate inside it
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [extern, ffi, boundary, exception, abi]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [extern "C"]
related: [cpp-err-noexcept-truthful, cpp-err-degradation-path]
sources:
  - title: GNU libstdc++ manual - Exceptions
    url: https://gcc.gnu.org/onlinedocs/libstdc++/manual/using_exceptions.html
  - title: cppreference - noexcept specifier
    url: https://en.cppreference.com/w/cpp/language/noexcept_spec
---
> Catch every exception at an extern "C" boundary and return an error the C caller can check.

## Why

C frames have no exception-handling metadata, so unwinding into or through code compiled without exception support reaches the unwinder's end and calls `std::terminate()` instead of running C cleanup or finding a handler. A C ABI function must therefore be a total boundary: nothing escapes it, and failure is reported through the C contract (an error code, a status out-parameter, or a documented endpoint).

## Bad

```cpp
#include <stdexcept>

// Bad: the exception unwinds into the C caller and terminates.
extern "C" int run_task(void) {
    throw std::runtime_error("task failed");
}
```

## Good

```cpp
#include <exception>
#include <stdexcept>

// Good: the boundary converts failure to the C contract.
extern "C" int run_task(void) noexcept {
    try {
        throw std::runtime_error("task failed");
    } catch (const std::exception&) {
        return -1;
    } catch (...) {
        return -2;
    }
}
```

## See Also

- [cpp-err-noexcept-truthful](err-noexcept-truthful.md) - why the boundary itself is marked noexcept
- [cpp-err-degradation-path](err-degradation-path.md) - choosing the report channel when exceptions cannot cross
