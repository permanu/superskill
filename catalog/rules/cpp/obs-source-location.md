---
id: cpp-obs-source-location
lang: cpp
prefix: obs
title: Capture the call site with std::source_location instead of __FILE__ macros
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging, source_location, diagnostics, call-site]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::source_location]
related: [cpp-obs-clog-vs-cerr, cpp-obs-report-once]
sources:
  - title: cppreference - std::source_location
    url: https://en.cppreference.com/w/cpp/utility/source_location
---
> Default a source_location parameter so the log records the caller's file and line.

## Why

`__FILE__` and `__LINE__` expand where the macro is written, so a logging helper records its own location instead of the caller's. `std::source_location::current()` used as a default argument is evaluated at the call site, giving the helper the file, line, column, and function of the code that logged. That turns "log" into a self-locating function with no macro wrappers.

## Bad

```cpp
#include <cstdio>

void log(const char* message) {
    std::fprintf(stderr, "%s\n", message); // no location: which call site logged this?
}

int main() {
    log("started");
    return 0;
}
```

## Good

```cpp
#include <cstdio>
#include <source_location>

void log(const char* message,
         const std::source_location location = std::source_location::current()) {
    std::fprintf(stderr, "%s:%u: %s\n",
                 location.file_name(), location.line(), message);
}

int main() {
    log("started"); // reports the caller's file and line
    return 0;
}
```

## See Also

- [cpp-obs-clog-vs-cerr](obs-clog-vs-cerr.md) - the stream this location should feed
- [cpp-obs-report-once](obs-report-once.md) - one report at the layer that handles the failure
