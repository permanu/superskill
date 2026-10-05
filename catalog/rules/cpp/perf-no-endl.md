---
id: cpp-perf-no-endl
lang: cpp
prefix: perf
title: Use '\n' instead of std::endl unless an explicit flush is required
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [endl, flush, newline, stream]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::endl, std::cout]
related: [cpp-perf-measure-first]
sources:
  - title: cppreference - std::endl
    url: https://en.cppreference.com/w/cpp/io/manip/endl
---
> Write '\n' for line breaks; std::endl adds a flush that usually costs performance.

## Why

`std::endl` inserts a newline and then flushes the stream, forcing buffered output out on every line. In most interactive scenarios the flush is redundant because input, `stderr`, or program termination flushes `stdout` anyway, and the standard notes that using `std::endl` in place of `'\n'` may significantly degrade output performance. Reserve `std::endl` or `std::flush` for the moments a line must appear immediately, such as progress from a long-running process.

## Bad

```cpp
#include <iostream>

int main() {
    for (int i = 0; i < 100; ++i)
        std::cout << i << std::endl; // flushes the stream on every line
    return 0;
}
```

## Good

```cpp
#include <iostream>

int main() {
    for (int i = 0; i < 100; ++i)
        std::cout << i << '\n'; // buffered; flushed when the stream decides
    return 0;
}
```

## See Also

- [cpp-perf-measure-first](perf-measure-first.md) - measuring I/O-heavy paths before tuning
