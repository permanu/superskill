---
id: cpp-io-flush-check
lang: cpp
prefix: io
title: Check flush or close for output files; buffered errors surface only there
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [flush, close, write-error, durability]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [flush, close]
related: [cpp-io-raii-streams, cpp-io-check-state]
sources:
  - title: cppreference - std::basic_ostream::flush
    url: https://en.cppreference.com/w/cpp/io/basic_ostream/flush
  - title: cppreference - std::basic_fstream
    url: https://en.cppreference.com/w/cpp/io/basic_fstream
---
> Writes are buffered; flush and observe the state before treating the data as saved.

## Why

An insertion into an output stream does not reach the file: the bytes sit in the stream buffer until a flush, and a failure such as a full disk is reported by setting `badbit` at that point. `flush()` writes the uncommitted changes and sets `badbit` if the underlying sync fails, which the stream state then exposes. Relying on the destructor to flush means the error occurs where no code can observe it, and the program exits as if the data were written.

## Bad

```cpp
#include <fstream>

int main() {
    std::ofstream file("out.txt");
    file << "important data\n"; // write errors may still be buffered
    return 0;                   // destruction flushes; the result is discarded
}
```

## Good

```cpp
#include <fstream>

int main() {
    std::ofstream file("out.txt");
    file << "important data\n";
    file.flush(); // surfaces the error here
    if (!file)
        return 1;
    return 0;
}
```

## See Also

- [cpp-io-raii-streams](io-raii-streams.md) - the destructor that closes without reporting
- [cpp-io-check-state](io-check-state.md) - reading the state flags
