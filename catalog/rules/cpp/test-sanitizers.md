---
id: cpp-test-sanitizers
lang: cpp
prefix: test
title: Run the test suite under AddressSanitizer and UndefinedBehaviorSanitizer
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sanitizer, asan, ubsan, memory-error]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-test-fuzz-entry, cpp-test-isolation]
sources:
  - title: Clang - AddressSanitizer
    url: https://clang.llvm.org/docs/AddressSanitizer.html
  - title: Clang - UndefinedBehaviorSanitizer
    url: https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html
---
> Build and run tests with -fsanitize=address,undefined so latent memory and UB bugs fail immediately.

## Why

Out-of-bounds accesses, use-after-free, double free, and undefined behavior can pass every test by luck on the machine where they were written and fail later in production. AddressSanitizer detects exactly those classes of bugs and exits on the first one, with a stack trace pointing at the offending access. A sanitizer build of the test suite turns silent corruption into a reproducible failure at the moment the test runs.

## Bad

```cpp
#include <cstdlib>

int read_first(const int* values, int size) {
    return values[size]; // off-by-one: reads past the end
}

void test_read_first() {
    int values[4] = {1, 2, 3, 4};
    if (read_first(values, 4) != 0)
        std::abort(); // may appear to pass without instrumentation
}
```

## Good

```cpp
#include <cstdlib>

// Build tests with: clang++ -fsanitize=address,undefined -fno-omit-frame-pointer
int read_first(const int* values, int size) {
    return size > 0 ? values[0] : 0; // bounds respected
}

void test_read_first() {
    int values[4] = {1, 2, 3, 4};
    if (read_first(values, 4) != 1)
        std::abort();
}
```

## See Also

- [cpp-test-fuzz-entry](test-fuzz-entry.md) - sanitizers make fuzzing results actionable
- [cpp-test-isolation](test-isolation.md) - a clean baseline for interpreting sanitizer findings
