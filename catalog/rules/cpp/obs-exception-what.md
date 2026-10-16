---
id: cpp-obs-exception-what
lang: cpp
prefix: obs
title: Classify exceptions without exporting arbitrary diagnostic text
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exception, what, logging, diagnostics]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::exception, what]
related: [shared-obs-allowlisted-diagnostics, cpp-obs-nested-cause, cpp-obs-error-code-message]
sources:
  - title: C++ draft - Standard exception classes
    url: https://eel.is/c++draft/exception
  - title: OWASP Logging Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  - title: cppreference - std::exception
    url: https://en.cppreference.com/w/cpp/error/exception
  - title: cppreference - std::exception::what
    url: https://en.cppreference.com/w/cpp/error/exception/what
---
> Classify exceptions into reviewed diagnostic codes instead of exporting their arbitrary what() text.

## Why

The string returned by `what()` is controlled by the throw site and can contain credentials, personal data or internal paths. Preserve exception information internally, but emit a static event and a bounded code at diagnostic sinks. Classifying known exception types retains useful operational distinctions without copying arbitrary messages into durable logs.

## Bad

```cpp
#include <iostream>
#include <stdexcept>

void handle() {
    try {
        throw std::runtime_error("connection refused");
    } catch (const std::exception& e) {
        std::cerr << "operation failed: " << e.what() << '\n';
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
        const char* code = dynamic_cast<const std::invalid_argument*>(&e) ? "INVALID_INPUT" : "OPERATION_FAILED";
        std::cerr << "operation.failed code=" << code << '\n';
    }
}

int main() {
    handle();
}
```

## See Also

- [cpp-obs-nested-cause](obs-nested-cause.md) - bounded classification of nested causes
- [shared-obs-allowlisted-diagnostics](../shared/obs-allowlisted-diagnostics.md) - the diagnostic allowlist policy
