---
id: cpp-num-duration
lang: cpp
prefix: num
title: Carry time units in the type with std::chrono::duration
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [chrono, duration, units, time]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::chrono::duration]
related: [cpp-obs-system-clock, cpp-num-constants]
sources:
  - title: cppreference - std::chrono::duration
    url: https://en.cppreference.com/w/cpp/chrono/duration
  - title: cppreference - std::chrono::system_clock
    url: https://en.cppreference.com/w/cpp/chrono/system_clock
---
> A duration carries its tick period in the type; a bare integer carries the unit in its name.

## Why

`std::chrono::duration` is a count plus a tick period, and the period is part of the type: conversions between durations are computed from the two periods, and the library provides the predefined types such as milliseconds and seconds. A function that takes a plain integer moves the unit into the parameter name, where the compiler cannot check it and a caller who passes microseconds instead of milliseconds gets a thousand-fold error. The duration type makes the unit part of the call.

## Bad

```cpp
#include <thread>

void wait(int milliseconds) { // the unit lives only in the name
    std::this_thread::sleep_for(std::chrono::milliseconds{milliseconds});
}

int main() {
    wait(500);
    return 0;
}
```

## Good

```cpp
#include <chrono>
#include <thread>

void wait(std::chrono::milliseconds duration) { // the unit is the type
    std::this_thread::sleep_for(duration);
}

int main() {
    wait(std::chrono::milliseconds{500});
    return 0;
}
```

## See Also

- [cpp-obs-system-clock](obs-system-clock.md) - choosing the clock for timestamps
- [cpp-num-constants](num-constants.md) - the same "let the library hold the value" idea
