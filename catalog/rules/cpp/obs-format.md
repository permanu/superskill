---
id: cpp-obs-format
lang: cpp
prefix: obs
title: Build log messages with std::format so argument mismatches fail at compile time
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [format, logging, message, printf]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::format]
related: [cpp-obs-source-location, cpp-obs-clog-vs-cerr]
sources:
  - title: cppreference - std::format
    url: https://en.cppreference.com/w/cpp/utility/format/format
---
> Compose messages with std::format; the format string is checked against the arguments at compile time.

## Why

A printf-style format string is validated, if at all, when the message is printed, so a wrong specifier or argument count is a latent runtime bug in a code path that only runs on errors. `std::format` checks the format string against the argument types during compilation and returns a `std::string`, so the same expression works with any output sink. The formatting syntax also keeps padding, precision, and radix in the format string instead of stream manipulators.

## Bad

```cpp
#include <cstdio>

void report(int request_id, int status) {
    char buffer[64];
    // Bad: mismatched or malformed format strings survive until run time.
    std::snprintf(buffer, sizeof(buffer), "request %d -> %d", request_id, status);
    std::puts(buffer);
}

int main() {
    report(42, 200);
}
```

## Good

```cpp
#include <format>
#include <iostream>

void report(int request_id, int status) {
    std::clog << std::format("request {} -> {}\n", request_id, status);
}

int main() {
    report(42, 200);
}
```

## See Also

- [cpp-obs-source-location](obs-source-location.md) - where the message came from
- [cpp-obs-clog-vs-cerr](obs-clog-vs-cerr.md) - which stream receives it
