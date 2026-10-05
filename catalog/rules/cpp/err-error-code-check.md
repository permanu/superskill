---
id: cpp-err-error-code-check
lang: cpp
prefix: err
title: Check an error code before consuming any output it guards
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error_code, errno, check, output, result]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::error_code, errno]
related: [cpp-err-error-code-systematic]
sources:
  - title: cppreference - std::error_code
    url: https://en.cppreference.com/w/cpp/error/error_code
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Test the returned error code before reading outputs; on failure those outputs are unspecified.

## Why

A call that returns an error code makes no promise about the buffers or values it was asked to fill; reading them on failure is undefined or garbage. Global indicators such as `errno` are worse: any later library call may overwrite them, so they must be captured immediately after the failing call. Consume the error first, then the payload.

## Bad

```cpp
#include <system_error>
#include <vector>

std::error_code read_all(int fd, std::vector<char>& out);

int main() {
    std::vector<char> data;
    read_all(0, data); // error ignored; data may be partially filled
    return static_cast<int>(data.size());
}
```

## Good

```cpp
#include <system_error>
#include <vector>

std::error_code read_all(int fd, std::vector<char>& out);

int main() {
    std::vector<char> data;
    if (auto ec = read_all(0, data); ec)
        return 1; // handle failure before touching data
    return static_cast<int>(data.size());
}
```

## See Also

- [cpp-err-error-code-systematic](err-error-code-systematic.md) - the systematic channel this check belongs to
