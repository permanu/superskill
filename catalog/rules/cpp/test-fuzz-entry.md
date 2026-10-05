---
id: cpp-test-fuzz-entry
lang: cpp
prefix: test
title: Give every parser a libFuzzer entry point instead of hand-picked inputs
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fuzzing, libfuzzer, parser, entrypoint]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [LLVMFuzzerTestOneInput]
related: [cpp-test-sanitizers, cpp-test-error-paths]
sources:
  - title: LLVM - libFuzzer
    url: https://llvm.org/docs/LibFuzzer.html
  - title: Clang - AddressSanitizer
    url: https://clang.llvm.org/docs/AddressSanitizer.html
---
> Expose parsers through LLVMFuzzerTestOneInput so coverage-guided fuzzing supplies the inputs.

## Why

Hand-written parser tests cover the inputs the author thought of, which is exactly the set that misses malformed and adversarial data. A libFuzzer target is a function that takes arbitrary bytes and runs them through the parser; the fuzzer mutates inputs to maximize coverage and reports crashes with a reproducer file. Combined with a sanitizer build, each finding is an immediate, replayable bug report.

## Bad

```cpp
#include <cstddef>

// Bad: the parser is exercised only with hand-picked inputs.
int parse_header(const unsigned char* data, std::size_t size);

void test_parse_header() {
    const unsigned char input[] = {0x01, 0x02};
    parse_header(input, sizeof(input));
}
```

## Good

```cpp
#include <cstddef>
#include <cstdint>

int parse_header(const unsigned char* data, std::size_t size);

// Build with: clang++ -fsanitize=fuzzer,address
extern "C" int LLVMFuzzerTestOneInput(const std::uint8_t* data, std::size_t size) {
    parse_header(data, size); // the fuzzer generates the inputs
    return 0;
}
```

## See Also

- [cpp-test-sanitizers](test-sanitizers.md) - the build that makes fuzzing findings actionable
- [cpp-test-error-paths](test-error-paths.md) - deterministic tests for the failure contract
