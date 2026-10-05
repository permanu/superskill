---
id: cpp-io-check-state
lang: cpp
prefix: io
title: Check the stream after I/O; failures set flags, they do not throw
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [stream, failbit, errors, getline]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::getline, fail]
related: [cpp-io-raii-streams, cpp-err-error-code-check]
sources:
  - title: cppreference - std::basic_ios
    url: https://en.cppreference.com/w/cpp/io/basic_ios
  - title: cppreference - std::basic_istream
    url: https://en.cppreference.com/w/cpp/io/basic_istream
---
> A failed read sets failbit; ignoring the stream state turns errors into empty data.

## Why

Streams do not throw by default: a failed extraction sets `failbit` (or `badbit` for irrecoverable errors) and the operation returns the stream, which converts to `false` when `fail()` is set. Code that ignores the return value cannot distinguish a missing file from an empty one, so the error surfaces later as a wrong result with no trace of its cause. Testing the stream at the point of the operation keeps the failure where it happened.

## Bad

```cpp
#include <fstream>
#include <string>

std::string first_line(const char* path) {
    std::ifstream file(path);
    std::string line;
    std::getline(file, line); // result ignored: a missing file yields ""
    return line;
}

int main() {
    return first_line("missing.txt").empty() ? 1 : 0;
}
```

## Good

```cpp
#include <fstream>
#include <stdexcept>
#include <string>

std::string first_line(const char* path) {
    std::ifstream file(path);
    std::string line;
    if (!std::getline(file, line)) // failbit or eofbit observed
        throw std::runtime_error("cannot read first line");
    return line;
}

int main() {
    return first_line("missing.txt").empty() ? 1 : 0;
}
```

## See Also

- [cpp-io-raii-streams](io-raii-streams.md) - the handle whose state is being checked
- [cpp-err-error-code-check](err-error-code-check.md) - the same discipline for error codes
