---
id: cpp-obs-report-once
lang: cpp
prefix: obs
title: Report a failure once, at the layer that handles it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging, exceptions, propagation, handlers]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-obs-exception-what, cpp-err-no-catch-all-swallow]
sources:
  - title: isocpp.org FAQ - Exceptions and Error Handling
    url: https://isocpp.org/wiki/faq/exceptions
  - title: GNU libstdc++ manual - Exceptions
    url: https://gcc.gnu.org/onlinedocs/libstdc++/manual/using_exceptions.html
---
> Log a failure where it is handled, not at every layer it passes through.

## Why

A catch block that logs and rethrows produces one entry per stack layer for a single failure, so one incident looks like several and the real report is buried. The layer that detects a problem should propagate it; the layer that can act on it should report it once, with the context only that layer has. Exception neutrality means propagating exceptions are not swallowed or annotated gratuitously at each frame.

## Bad

```cpp
#include <iostream>
#include <stdexcept>

int parse(const char* text) {
    try {
        return std::stoi(text);
    } catch (const std::exception& e) {
        std::cerr << "parse failed: " << e.what() << '\n'; // logged here
        throw;                                             // rethrown here
    }
}

int main() {
    try {
        return parse("x");
    } catch (const std::exception& e) {
        std::cerr << "operation failed: " << e.what() << '\n'; // logged again here
        return 1;
    }
}
```

## Good

```cpp
#include <iostream>
#include <stdexcept>

int parse(const char* text) {
    return std::stoi(text); // propagates without logging
}

int main() {
    try {
        return parse("x");
    } catch (const std::exception& e) {
        std::cerr << "operation failed: " << e.what() << '\n'; // reported once
        return 1;
    }
}
```

## See Also

- [cpp-obs-exception-what](obs-exception-what.md) - the message carried into the single report
- [cpp-err-no-catch-all-swallow](err-no-catch-all-swallow.md) - the other half: never dropping the failure
