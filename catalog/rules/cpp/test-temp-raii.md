---
id: cpp-test-temp-raii
lang: cpp
prefix: test
title: Write test files under a unique temporary directory and let RAII remove them
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [temporary, filesystem, cleanup, isolation]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::filesystem::temp_directory_path]
related: [cpp-test-hermetic, cpp-test-fixture-raii]
sources:
  - title: cppreference - std::filesystem::temp_directory_path
    url: https://en.cppreference.com/w/cpp/filesystem/temp_directory_path
  - title: GoogleTest Primer
    url: https://google.github.io/googletest/primer.html
---
> Give each test its own temporary directory under temp_directory_path and delete it on exit.

## Why

A fixed path such as `/tmp/report.txt` is shared state: two tests or two parallel runs overwrite each other, and a stale file from a previous run changes the result. `temp_directory_path` returns a directory suitable for temporary files on every platform, and a unique subdirectory per test keeps runs isolated. Removing the directory in an RAII helper guarantees cleanup on success, failure, and exception.

## Bad

```cpp
#include <cstdio>

void test_write_report() {
    const char* path = "/tmp/report.txt"; // shared fixed path: runs collide
    std::FILE* file = std::fopen(path, "w");
    std::fputs("data", file);
    std::fclose(file);
    std::remove(path);
}
```

## Good

```cpp
#include <filesystem>
#include <fstream>

void test_write_report(const std::filesystem::path& directory) {
    // The harness creates a unique directory under temp_directory_path()
    // and removes it when the test ends.
    const std::filesystem::path path = directory / "report.txt";
    std::ofstream(path) << "data";
}
```

## See Also

- [cpp-test-hermetic](test-hermetic.md) - no dependence on the developer's filesystem
- [cpp-test-fixture-raii](test-fixture-raii.md) - RAII for the rest of the test's resources
