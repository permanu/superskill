---
id: cpp-obs-system-clock
lang: cpp
prefix: obs
title: Timestamp log events with system_clock, not steady_clock
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [timestamp, chrono, system_clock, logging]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::chrono::system_clock, std::chrono::steady_clock]
related: [cpp-obs-thread-id, cpp-obs-source-location]
sources:
  - title: cppreference - std::chrono::system_clock
    url: https://en.cppreference.com/w/cpp/chrono/system_clock
---
> Timestamp log events with the wall clock; use steady_clock only to measure durations.

## Why

`steady_clock` is monotonic but its epoch is arbitrary, so a timestamp taken from it cannot be compared with anything outside the process: not with other machines, not with calendar time, not with a user report. `system_clock` represents wall-clock time and is the clock that maps to `time_t`, which is what log readers need. Keep `steady_clock` for measuring elapsed time, where its monotonicity is the point.

## Bad

```cpp
#include <chrono>
#include <cstdio>

void log_event(const char* message) {
    const auto now = std::chrono::steady_clock::now();
    std::fprintf(stderr, "%lld: %s\n",
                 static_cast<long long>(now.time_since_epoch().count()), message);
}

int main() {
    log_event("started"); // arbitrary epoch: meaningless outside this process
}
```

## Good

```cpp
#include <chrono>
#include <cstdio>
#include <ctime>

void log_event(const char* message) {
    const auto now = std::chrono::system_clock::now();
    const std::time_t time = std::chrono::system_clock::to_time_t(now);
    std::fprintf(stderr, "%s: %s\n", std::ctime(&time), message);
}

int main() {
    log_event("started"); // wall-clock timestamp
}
```

## See Also

- [cpp-obs-thread-id](obs-thread-id.md) - the other attribute that makes a log line traceable
- [cpp-obs-source-location](obs-source-location.md) - where the event happened
