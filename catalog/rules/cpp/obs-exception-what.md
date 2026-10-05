---
id: cpp-obs-exception-what
lang: cpp
prefix: obs
title: Include the exception's what() text in the failure report
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exception, what, logging, diagnostics]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::exception, what]
related: [cpp-obs-nested-cause, cpp-obs-error-code-message]
sources:
  - title: cppreference - std::exception
    url: https://en.cppreference.com/w/cpp/error/exception
  - title: cppreference - std::exception::what
    url: https://en.cppreference.com/w/cpp/error/exception/what
---
> Log e.what() with the failure; the message is the only description the exception carries.

## Why

Standard exceptions provide `what()` as their explanatory string, and types derived from them carry whatever detail the thrower recorded. A handler that prints only "operation failed" discards that detail and forces a rerun under a debugger to learn the cause. Printing the message at the boundary where the exception is absorbed turns the log into the diagnosis; additional context can be appended by the same line.

## Bad

```cpp
#include <iostream>
#include <stdexcept>

void handle() {
    try {
        throw std::runtime_error("connection refused");
    } catch (const std::exception&) {
        std::cerr << "operation failed\n"; // e.what() discarded
    }
}

int main() {
    handle();
}
```

## Good

```cpp
#include <iostream>
#include <stdexcept>

void handle() {
    try {
        throw std::runtime_error("connection refused");
    } catch (const std::exception& e) {
        std::cerr << "operation failed: " << e.what() << '\n'; // message preserved
    }
}

int main() {
    handle();
}
```

## See Also

- [cpp-obs-nested-cause](obs-nested-cause.md) - printing the whole cause chain
- [cpp-obs-error-code-message](obs-error-code-message.md) - the same discipline for error codes
