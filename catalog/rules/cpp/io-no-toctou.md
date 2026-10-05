---
id: cpp-io-no-toctou
lang: cpp
prefix: io
title: Do not check-then-use the filesystem; attempt the operation instead
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [toctou, exists, race, filesystem]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::filesystem::exists]
related: [cpp-sec-path-traversal, cpp-io-error-code-overloads]
sources:
  - title: "CWE-367: Time-of-check Time-of-use (TOCTOU) Race Condition"
    url: https://cwe.mitre.org/data/definitions/367.html
  - title: cppreference - Filesystem library
    url: https://en.cppreference.com/w/cpp/filesystem
---
> exists() answers about the past; open the file and handle the failure.

## Why

CWE-367 describes the gap between a check and the use of the same resource: between `exists(file)` and the open, another process can remove, replace, or redirect the name, so the check's answer is stale and the use acts on something else. The basic mitigation the entry gives is not to perform the check before the use; opening once collapses both into a single operation whose failure is reported by the open itself. The filesystem library also declares behavior undefined when its calls introduce a filesystem race, which a check-then-use pair invites.

## Bad

```cpp
#include <filesystem>
#include <fstream>

int main() {
    const std::filesystem::path file = "config.ini";
    if (std::filesystem::exists(file))                // the check runs first
        return std::ifstream(file).is_open() ? 0 : 1; // the state can change before use
    return 1;
}
```

## Good

```cpp
#include <fstream>

int main() {
    std::ifstream file("config.ini"); // attempt once and handle the result
    return file ? 0 : 1;
}
```

## See Also

- [cpp-sec-path-traversal](sec-path-traversal.md) - the check that confines a path instead of trusting it
- [cpp-io-error-code-overloads](io-error-code-overloads.md) - handling the failure the attempt reports
