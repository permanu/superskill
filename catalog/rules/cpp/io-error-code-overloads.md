---
id: cpp-io-error-code-overloads
lang: cpp
prefix: io
title: Use the error_code overloads for expected filesystem failures
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [filesystem, error_code, exceptions, remove]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::filesystem::remove]
related: [cpp-io-path-type, cpp-err-error-code-systematic]
sources:
  - title: cppreference - Filesystem library
    url: https://en.cppreference.com/w/cpp/filesystem
  - title: cppreference - std::filesystem::rename
    url: https://en.cppreference.com/w/cpp/filesystem/rename
---
> A file that may legitimately be absent is handled with an error_code, not an exception.

## Why

Every filesystem operation that can fail has a non-throwing overload taking `std::error_code&`; on success it clears the code, on failure it stores the OS error, and the throwing form constructs a `filesystem_error` instead. When absence is an expected outcome, exceptions make the normal case pay for stack unwinding and force callers to write a handler for routine control flow. The error_code form keeps the check local and the report in the caller's own error channel.

## Bad

```cpp
#include <filesystem>
#include <iostream>

void report_size(const std::filesystem::path& file) {
    try {
        std::cout << std::filesystem::file_size(file) << '\n'; // throws when absent
    } catch (const std::filesystem::filesystem_error& e) {
        std::clog << "skip: " << e.what() << '\n'; // exceptions for a routine case
    }
}

int main() {
    report_size("build/cache.tmp");
}
```

## Good

```cpp
#include <filesystem>
#include <iostream>
#include <system_error>

void report_size(const std::filesystem::path& file) {
    std::error_code ec;
    const auto size = std::filesystem::file_size(file, ec); // absent file is expected
    if (ec)
        std::clog << "skip: " << ec.message() << '\n';
    else
        std::cout << size << '\n';
}

int main() {
    report_size("build/cache.tmp");
}
```

## See Also

- [cpp-io-path-type](io-path-type.md) - the path value these functions consume
- [cpp-err-error-code-systematic](err-error-code-systematic.md) - carrying the code onward
