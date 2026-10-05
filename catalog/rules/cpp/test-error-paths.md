---
id: cpp-test-error-paths
lang: cpp
prefix: test
title: Test the failure paths, not only the happy path
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exceptions, errors, negative-cases, contract]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-test-data-driven, cpp-err-expected-for-recoverable]
sources:
  - title: GoogleTest Assertions Reference
    url: https://google.github.io/googletest/reference/assertions.html
  - title: GoogleTest Primer
    url: https://google.github.io/googletest/primer.html
---
> Verify that invalid input fails in the documented way, not only that valid input succeeds.

## Why

The success path is the code most likely to be exercised by hand and by usage; the failure path runs only when something is already wrong. Testing that invalid input throws the documented type, or returns the documented error, pins the contract before it is needed and catches refactors that silently change it. Frameworks provide assertions for exactly this, verifying that a statement throws a given exception type.

## Bad

```cpp
#include <cstdlib>

int parse_port(const char* text);

void test_parse_port() {
    if (parse_port("8080") != 8080)
        std::abort(); // only the success path is covered
}
```

## Good

```cpp
#include <cstdlib>
#include <stdexcept>

int parse_port(const char* text);

void test_parse_port() {
    if (parse_port("8080") != 8080)
        std::abort();

    bool threw = false;
    try {
        parse_port("not-a-port");
    } catch (const std::invalid_argument&) {
        threw = true;
    }
    if (!threw)
        std::abort(); // the documented failure path is verified
}
```

## See Also

- [cpp-test-data-driven](test-data-driven.md) - covering many failure inputs at once
- [cpp-err-expected-for-recoverable](err-expected-for-recoverable.md) - the error contract being tested
