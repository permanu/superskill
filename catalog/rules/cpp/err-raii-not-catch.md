---
id: cpp-err-raii-not-catch
lang: cpp
prefix: err
title: Use RAII handles for cleanup instead of try/catch blocks that release resources
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [raii, cleanup, resource, finally, catch]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::unique_ptr]
related: [cpp-err-dtor-noexcept]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: isocpp.org FAQ - Exceptions and Error Handling
    url: https://isocpp.org/wiki/faq/exceptions
---
> Wrap every resource in an RAII handle; delete hand-written try/catch cleanup blocks.

## Why

Manual release in a catch block must be repeated on every failure path and every early return, and the one path that forgets leaks. RAII releases exactly once in the owning object's destructor, which runs on normal exit, early return, and stack unwinding alike. A try/catch whose only job is `delete`/`fclose`/`unlock` is the signal that the resource belongs in an owning object.

## Bad

```cpp
#include <cstdio>
#include <stdexcept>

int parse_file(const char* path) {
    std::FILE* file = std::fopen(path, "r");
    if (!file)
        return -1;
    try {
        int value = 0;
        if (std::fscanf(file, "%d", &value) != 1)
            throw std::runtime_error("parse failed");
        std::fclose(file);
        return value;
    } catch (...) {
        std::fclose(file); // manual cleanup on one path
        throw;
    }
}
```

## Good

```cpp
#include <cstdio>
#include <memory>
#include <stdexcept>

int parse_file(const char* path) {
    std::unique_ptr<std::FILE, int (*)(std::FILE*)> file(std::fopen(path, "r"),
                                                         &std::fclose);
    if (!file)
        throw std::runtime_error("open failed");

    int value = 0;
    if (std::fscanf(file.get(), "%d", &value) != 1)
        throw std::runtime_error("parse failed"); // file closed during unwind
    return value;
}
```

## See Also

- [cpp-err-dtor-noexcept](err-dtor-noexcept.md) - handles must clean up without throwing
