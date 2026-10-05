---
id: cpp-err-no-catch-all-swallow
lang: cpp
prefix: err
title: A catch(...) handler must rethrow, translate, or report; never swallow silently
severity: must
enforce: both
tool: clang-tidy:bugprone-empty-catch
baseline: latest
status: verified
triggers:
  keywords: [catch, swallow, rethrow, translate, logging]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [catch]
related: [cpp-err-catch-order, cpp-err-translate-with-context]
sources:
  - title: GNU libstdc++ manual - Exceptions
    url: https://gcc.gnu.org/onlinedocs/libstdc++/manual/using_exceptions.html
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Handle, translate, or rethrow at every catch; an empty handler converts a failure into silent corruption.

## Why

An exception carries the only record that an operation failed. Swallowing it lets execution continue with the postcondition broken, turning a local, diagnosable error into a remote wrong result. A terminating handler is acceptable only at a boundary that cannot propagate, and even there it must report the failure; otherwise the handler must rethrow or translate.

## Bad

```cpp
#include <fstream>
#include <string>

void log_line(const std::string& line) {
    try {
        std::ofstream out("audit.log", std::ios::app);
        out << line << '\n';
    } catch (...) {
        // Bad: the log line is lost and no one knows.
    }
}
```

## Good

```cpp
#include <cerrno>
#include <exception>
#include <fstream>
#include <string>
#include <system_error>

void report_failure(const char* reason);

void log_line(const std::string& line) {
    try {
        std::ofstream out("audit.log", std::ios::app);
        out << line << '\n';
        if (!out)
            throw std::system_error(errno, std::generic_category(), "audit.log");
    } catch (const std::exception& e) {
        report_failure(e.what()); // report at the boundary that can
    }
}
```

## See Also

- [cpp-err-catch-order](err-catch-order.md) - specific handlers before the terminating one
- [cpp-err-translate-with-context](err-translate-with-context.md) - translating without losing the cause
