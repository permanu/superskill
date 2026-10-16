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
> Recover, translate, or rethrow caught failures; report unrecoverable failures at the terminating boundary instead of silently continuing.

## Why

Silently discarding an exception can hide that an operation failed to establish its postcondition. Recover only when the handler can restore a valid outcome; otherwise propagate or translate the failure. At the application boundary, report an unrecoverable failure with an approved event and return a failure status rather than continuing as though the operation succeeded.

## Bad

```cpp
#include <fstream>
#include <string>

void log_line(const std::string& line) {
    try {
        std::ofstream out;
        out.exceptions(std::ios::failbit | std::ios::badbit);
        out.open("", std::ios::app);
        out << line << '\n';
    } catch (...) {
        // Bad: the log line is lost and no one knows.
    }
}
```

## Good

```cpp
#include <fstream>
#include <iostream>
#include <string>

void log_line(const std::string& line) {
    std::ofstream out;
    out.exceptions(std::ios::failbit | std::ios::badbit);
    out.open("", std::ios::app);
    out << line << '\n';
    out.close();
}

int main() {
    try {
        log_line("event");
    } catch (...) {
        std::cerr << "audit.write_failed\n";
        return 1;
    }
}
```

## See Also

- [cpp-err-catch-order](err-catch-order.md) - specific handlers before the terminating one
- [cpp-err-translate-with-context](err-translate-with-context.md) - translating without losing the cause
