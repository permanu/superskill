---
id: cpp-obs-atomic-lines
lang: cpp
prefix: obs
title: Serialize whole log lines so concurrent writers cannot interleave them
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [threads, logging, interleaving, mutex]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::mutex, std::lock_guard]
related: [cpp-obs-thread-id, cpp-obs-source-location, cpp-raii-lock-guard]
sources:
  - title: cppreference - std::clog
    url: https://en.cppreference.com/w/cpp/io/clog
  - title: cppreference - std::lock_guard
    url: https://en.cppreference.com/w/cpp/thread/lock_guard
---
> Hold one mutex for a whole log line so no other thread can interleave its fragments.

## Why

Concurrent access to the standard streams is free of data races, but each `<<` is a separate operation: two threads writing several fragments each can alternate mid-line, producing unreadable output exactly when concurrency is being debugged. Holding a single mutex across the line's insertions makes every line appear intact, and the lock is held only for the formatting and writing, never for the work being logged.

## Bad

```cpp
#include <iostream>
#include <thread>

void worker(int id) {
    std::cout << "worker " << id << ": step 1\n";
    std::cout << "worker " << id << ": step 2\n"; // lines can interleave
}

int main() {
    std::thread first(worker, 1);
    std::thread second(worker, 2);
    first.join();
    second.join();
}
```

## Good

```cpp
#include <iostream>
#include <mutex>
#include <thread>

std::mutex log_mutex;

void worker(int id) {
    const std::lock_guard<std::mutex> lock(log_mutex);
    std::cout << "worker " << id << ": step 1\n";
    std::cout << "worker " << id << ": step 2\n"; // emitted as one block
}

int main() {
    std::thread first(worker, 1);
    std::thread second(worker, 2);
    first.join();
    second.join();
}
```

## See Also

- [cpp-obs-thread-id](obs-thread-id.md) - identifying which thread produced a line
- [cpp-obs-source-location](obs-source-location.md) - where in the code the line was written
- [cpp-raii-lock-guard](raii-lock-guard.md) - releasing the logging lock on every path
