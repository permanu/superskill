---
id: cpp-err-error-code-systematic
lang: cpp
prefix: err
title: With exceptions unavailable, carry std::error_code through expected instead of ad-hoc integers
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error_code, no-exceptions, result, status]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::error_code, std::expected]
related: [cpp-err-expected-for-recoverable, cpp-err-error-code-check, cpp-err-degradation-path]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::error_code
    url: https://en.cppreference.com/w/cpp/error/error_code
---
> In no-exception code, return std::expected<T, std::error_code> on every fallible path and check it.

## Why

Ad-hoc integer codes require every caller to memorize a private table, mix success and failure values in one channel, and are ignored by default. `std::error_code` pairs a stable numeric value with a category that renders a portable message, and `std::expected` attaches it to the result so failure cannot be consumed as data. The strategy must be uniform, or some call site will skip the check.

## Bad

```cpp
#include <string>

// Bad: magic codes, no [[nodiscard]], success easy to miss.
int connect_to(const std::string& host) {
    if (host.empty())
        return -2; // resolve failure, remembered only by convention
    return 0;
}

int main() {
    connect_to("example.com"); // return value ignored
    return 0;
}
```

## Good

```cpp
#include <expected>
#include <string>
#include <system_error>

[[nodiscard]] std::expected<int, std::error_code>
connect_to(const std::string& host) {
    if (host.empty())
        return std::unexpected(std::make_error_code(std::errc::host_unreachable));
    return 0;
}

int main() {
    auto fd = connect_to("example.com");
    if (!fd)
        return 1;
    return *fd;
}
```

## See Also

- [cpp-err-expected-for-recoverable](err-expected-for-recoverable.md) - expected as the success-or-error channel
- [cpp-err-error-code-check](err-error-code-check.md) - check the code before consuming outputs
- [cpp-err-degradation-path](err-degradation-path.md) - what to do when the strategy cannot recover
