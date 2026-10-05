---
id: cpp-obs-thread-id
lang: cpp
prefix: obs
title: Include the thread id in log lines produced by concurrent code
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [thread, logging, diagnostics, id]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::this_thread::get_id]
related: [cpp-obs-atomic-lines, cpp-obs-source-location]
sources:
  - title: cppreference - std::thread::id
    url: https://en.cppreference.com/w/cpp/thread/thread/id
  - title: cppreference - std::clog
    url: https://en.cppreference.com/w/cpp/io/clog
---
> Prefix log lines with this_thread::get_id() so concurrent output can be attributed.

## Why

When several threads write to one log, a line without a thread identifier cannot be attributed to a worker, so interleaved histories are impossible to reconstruct. `std::thread::id` is a lightweight, copyable identifier that streams to any ostream, giving each line an attribution that survives later correlation. It is exactly the information needed to follow one worker's sequence through a shared log.

## Bad

```cpp
#include <iostream>

void log(const char* message) {
    std::clog << message << '\n'; // which thread wrote this?
}

int main() {
    log("started");
}
```

## Good

```cpp
#include <iostream>
#include <thread>

void log(const char* message) {
    std::clog << "[thread " << std::this_thread::get_id() << "] "
              << message << '\n';
}

int main() {
    log("started");
}
```

## See Also

- [cpp-obs-atomic-lines](obs-atomic-lines.md) - keeping each thread's line intact
- [cpp-obs-source-location](obs-source-location.md) - where in the code the line was written
