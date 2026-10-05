---
id: cpp-obs-error-code-message
lang: cpp
prefix: obs
title: Report error codes through their message() text, not just the numeric value
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error_code, message, reporting, diagnostics]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::error_code]
related: [cpp-err-error-code-systematic, cpp-obs-format]
sources:
  - title: cppreference - std::error_code
    url: https://en.cppreference.com/w/cpp/error/error_code
---
> Print error_code::message() so reports carry the category's portable text.

## Why

An `std::error_code` is a value plus a category pointer; the numeric value alone is meaningless without knowing the category that produced it. `message()` asks the category to render the value as text, so the log line is readable and portable across platforms. The category name and value remain available when the raw numbers are needed for correlation.

## Bad

```cpp
#include <cstdio>
#include <system_error>

void report(std::error_code ec) {
    if (ec)
        std::fprintf(stderr, "error %d\n", ec.value()); // category and text lost
}

int main() {
    report(std::make_error_code(std::errc::permission_denied));
}
```

## Good

```cpp
#include <cstdio>
#include <system_error>

void report(std::error_code ec) {
    if (ec)
        std::fprintf(stderr, "error: %s\n", ec.message().c_str()); // portable text
}

int main() {
    report(std::make_error_code(std::errc::permission_denied));
}
```

## See Also

- [cpp-err-error-code-systematic](err-error-code-systematic.md) - the error channel being reported
- [cpp-obs-format](obs-format.md) - composing the report line
