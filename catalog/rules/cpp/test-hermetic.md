---
id: cpp-test-hermetic
lang: cpp
prefix: test
title: "Keep tests hermetic: no machine-specific paths or ambient environment"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [hermetic, paths, environment, portability]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::filesystem::path]
related: [cpp-test-temp-raii, cpp-test-isolation]
sources:
  - title: GoogleTest Primer
    url: https://google.github.io/googletest/primer.html
---
> Tests depend only on inputs the harness supplies, not on the developer's machine.

## Why

A test that opens `/Users/alice/project/testdata/input.csv` passes on one machine and fails everywhere else, and its failure looks like a code bug rather than a configuration difference. Tests are meant to be portable and reusable across operating systems, compilers, and CI runners. Taking paths and environment values as parameters, or deriving them from the harness, makes the dependency explicit and the test reproducible.

## Bad

```cpp
#include <fstream>

std::ifstream open_fixture() {
    // Bad: absolute path tied to one developer's checkout.
    return std::ifstream("/Users/alice/project/testdata/input.csv");
}
```

## Good

```cpp
#include <filesystem>
#include <fstream>

std::ifstream open_fixture(const std::filesystem::path& directory) {
    return std::ifstream(directory / "input.csv"); // location supplied by the harness
}
```

## See Also

- [cpp-test-temp-raii](test-temp-raii.md) - where writable test files belong
- [cpp-test-isolation](test-isolation.md) - the same discipline for in-memory state
