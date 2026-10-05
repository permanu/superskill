---
id: cpp-conc-stop-token
lang: cpp
prefix: conc
title: Cancel worker threads cooperatively with std::stop_token, not a shared flag
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [stop_token, cancellation, jthread, shutdown]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::stop_token, request_stop]
related: [cpp-conc-jthread-over-thread, cpp-conc-no-detach, cpp-conc-wait-predicate]
sources:
  - title: cppreference - std::stop_token
    url: https://en.cppreference.com/w/cpp/thread/stop_token
  - title: cppreference - std::jthread
    url: https://en.cppreference.com/w/cpp/thread/jthread
---
> Give workers a stop_token from their jthread; request_stop plus join is the shutdown protocol.

## Why

A hand-rolled `bool` stop flag is read and written from different threads without synchronization, which is a data race, and it cannot interrupt waits: the worker notices only at the next poll. `std::jthread` owns a stop-state; the worker receives a `stop_token`, checks `stop_requested()`, and waits can be made interruptible through the token. The destructor requests stop and joins, so shutdown is one protocol instead of ad-hoc flags.

## Bad

```cpp
bool stop_requested = false; // written by main, read by worker: data race

void poll_loop() {
    while (!stop_requested) {
        // work; a blocking wait here ignores the flag entirely
    }
}
```

## Good

```cpp
#include <stop_token>

void poll_loop(std::stop_token token) {
    while (!token.stop_requested()) {
        // work; waits can take the token to wake on stop
    }
}
```

## See Also

- [cpp-conc-jthread-over-thread](conc-jthread-over-thread.md) - the owner that carries the stop-state
- [cpp-conc-no-detach](conc-no-detach.md) - joining the worker after requesting stop
- [cpp-conc-wait-predicate](conc-wait-predicate.md) - interruptible waits with the token
