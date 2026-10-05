---
id: cpp-io-sync-with-stdio
lang: cpp
prefix: io
title: Disable stdio synchronization when the program does not mix C and C++ I/O
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sync_with_stdio, performance, iostream, buffering]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::ios::sync_with_stdio]
related: [cpp-perf-no-endl, cpp-io-raii-streams]
sources:
  - title: cppreference - std::ios_base::sync_with_stdio
    url: https://en.cppreference.com/w/cpp/io/ios_base/sync_with_stdio
  - title: cppreference - std::clog
    url: https://en.cppreference.com/w/cpp/io/clog
---
> Synchronized streams are unbuffered; turn the synchronization off before the first I/O.

## Why

While the C++ standard streams are synchronized with the C streams, each I/O operation is immediately applied to the C stream's buffer, which makes the synchronized streams effectively unbuffered and costs a call per insertion. Programs that do all their I/O through iostreams pay that cost for an interoperability they never use; turning synchronization off lets the C++ streams buffer independently. The call belongs before the first I/O, because its effect after I/O has occurred is implementation-defined.

## Bad

```cpp
#include <iostream>

int main() {
    for (int i = 0; i < 1000; ++i)
        std::cout << i << '\n'; // each operation crosses into the C buffer
    return 0;
}
```

## Good

```cpp
#include <iostream>

int main() {
    std::ios::sync_with_stdio(false); // C++ streams buffer on their own
    for (int i = 0; i < 1000; ++i)
        std::cout << i << '\n';
    return 0;
}
```

## See Also

- [cpp-perf-no-endl](perf-no-endl.md) - the other forced-flush trap in output code
- [cpp-io-raii-streams](io-raii-streams.md) - buffering that is flushed on destruction
