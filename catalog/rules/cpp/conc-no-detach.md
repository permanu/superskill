---
id: cpp-conc-no-detach
lang: cpp
prefix: conc
title: Do not detach threads; keep every thread owned and joined
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [detach, thread, lifetime, shutdown]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [detach, std::jthread]
related: [cpp-conc-jthread-over-thread, cpp-conc-stop-token]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::jthread
    url: https://en.cppreference.com/w/cpp/thread/jthread
---
> Never detach; a thread must remain owned so shutdown can join it and see its result.

## Why

A detached thread runs outside any owner: nothing can join it, nothing observes when it finishes, and it may still touch objects that are being destroyed at shutdown, causing crashes or races that are hard to reproduce. Keeping the thread owned makes shutdown deterministic, propagates its completion to a known point, and lets cancellation be requested and awaited.

## Bad

```cpp
#include <thread>

void poll();

int main() {
    std::thread watcher(poll);
    watcher.detach(); // no owner: shutdown cannot wait for it
}
```

## Good

```cpp
#include <thread>

void poll(std::stop_token token);

int main() {
    std::jthread watcher(poll); // owned; joined at scope exit
}
```

## See Also

- [cpp-conc-jthread-over-thread](conc-jthread-over-thread.md) - automatic joining with jthread
- [cpp-conc-stop-token](conc-stop-token.md) - asking the owned thread to stop
