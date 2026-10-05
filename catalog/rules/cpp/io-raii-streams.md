---
id: cpp-io-raii-streams
lang: cpp
prefix: io
title: Let stream objects own the file; no manual open and close pairs
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fstream, close, raii, file]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::ofstream, std::ifstream]
related: [cpp-raii-wrap-resources, cpp-io-flush-check]
sources:
  - title: cppreference - std::basic_fstream
    url: https://en.cppreference.com/w/cpp/io/basic_fstream
  - title: cppreference - std::basic_ios
    url: https://en.cppreference.com/w/cpp/io/basic_ios
---
> File streams close in their destructor; manual handles leak on every early return.

## Why

A stream object's destructor "closes the file" as part of destroying the associated buffer, so the close happens on every path out of the scope, including exceptions. A `FILE*` pair requires a close call at each exit, and the first early return or throw that forgets it leaks the handle; the same class of leak drains descriptor tables in long-running programs. The stream also reports open failure through its state, so one check covers the open.

## Bad

```cpp
#include <cstdio>

int main() {
    std::FILE* file = std::fopen("data.txt", "w"); // manual handle
    if (file == nullptr)
        return 1;
    std::fputs("hello\n", file);
    std::fclose(file); // skipped on any early return
    return 0;
}
```

## Good

```cpp
#include <fstream>

int main() {
    std::ofstream file("data.txt"); // opens here
    if (!file)
        return 1;
    file << "hello\n";
    return 0; // destructor closes and flushes
}
```

## See Also

- [cpp-raii-wrap-resources](raii-wrap-resources.md) - the general handle-owning pattern
- [cpp-io-flush-check](io-flush-check.md) - when the write result must be observed
