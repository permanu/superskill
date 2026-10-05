---
id: cpp-sec-no-format-string
lang: cpp
prefix: sec
title: Never let external input be the format string
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [printf, format-string, injection, logging]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::printf, std::fprintf]
related: [cpp-obs-format, cpp-sec-safe-string-functions]
sources:
  - title: "CWE-134: Use of Externally-Controlled Format String"
    url: https://cwe.mitre.org/data/definitions/134.html
  - title: cppreference - std::format
    url: https://en.cppreference.com/w/cpp/utility/format/format
---
> Pass data as an argument, not as the format; specifiers in input read memory and write through pointers.

## Why

A printf-style function interprets its format argument as a program: `%x` consumes stack values the caller never passed, and `%n` writes through a pointer taken from that same stack, which CWE-134 documents as a read and write primitive. The mistake happens most in logging helpers that forward a message string directly. Passing the message as an argument to a fixed `"%s"` format keeps it data; `std::format` removes the separation entirely by checking the format at compile time.

## Bad

```cpp
#include <cstdio>

void report(const char* message) {
    std::printf(message); // the message becomes the format string
}

int main() {
    report("value: %x %x\n");
}
```

## Good

```cpp
#include <cstdio>

void report(const char* message) {
    std::printf("%s", message); // the message is data, never the format
}

int main() {
    report("value: %x %x\n");
}
```

## See Also

- [cpp-obs-format](obs-format.md) - compile-time-checked formatting for log messages
- [cpp-sec-safe-string-functions](sec-safe-string-functions.md) - the same "input is data" rule for copies
