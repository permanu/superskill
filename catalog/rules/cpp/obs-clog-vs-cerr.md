---
id: cpp-obs-clog-vs-cerr
lang: cpp
prefix: obs
title: Send routine diagnostics to std::clog and immediate errors to std::cerr
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [clog, cerr, logging, stderr]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::clog, std::cerr]
related: [cpp-obs-source-location, cpp-perf-no-endl]
sources:
  - title: cppreference - std::clog
    url: https://en.cppreference.com/w/cpp/io/clog
  - title: cppreference - std::cerr
    url: https://en.cppreference.com/w/cpp/io/cerr
---
> Log routine events to std::clog; reserve unbuffered std::cerr for errors that must appear now.

## Why

`std::clog` writes to the same destination as `std::cerr` but is buffered, so high-volume diagnostics do not pay a flush per line, and it is not tied to `cout`. `std::cerr` is unbuffered, which is what makes it suitable for the message immediately before a crash or abort, where buffered output is not guaranteed to appear. Choosing by urgency keeps the log cheap in the normal case and reliable in the fatal case.

## Bad

```cpp
#include <iostream>

void audit(const char* message) {
    std::cerr << "audit: " << message << '\n'; // unbuffered stream for routine logs
}

int main() {
    audit("login");
}
```

## Good

```cpp
#include <iostream>

void audit(const char* message) {
    std::clog << "audit: " << message << '\n'; // buffered log stream
}

int main() {
    audit("login");
}
```

## See Also

- [cpp-obs-source-location](obs-source-location.md) - enriching the log line
- [cpp-perf-no-endl](perf-no-endl.md) - avoiding forced flushes in the log path
