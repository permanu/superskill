---
id: cpp-io-path-type
lang: cpp
prefix: io
title: Build paths with filesystem::path, not string concatenation
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [path, filesystem, separator, join]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::filesystem::path]
related: [cpp-sec-path-traversal, cpp-io-error-code-overloads]
sources:
  - title: cppreference - std::filesystem::path
    url: https://en.cppreference.com/w/cpp/filesystem/path
  - title: cppreference - Filesystem library
    url: https://en.cppreference.com/w/cpp/filesystem
---
> Join with operator/; it knows the platform's separator and keeps the path a path.

## Why

`root + "/" + name` hardcodes the separator and drops the meaning of the value into an untyped string, so every function in the chain must re-derive which part is a directory and which is a name. `std::filesystem::path` stores the pathname in the native format and converts between representations as member functions require; `operator/` appends an element with the preferred separator, and the decomposition functions (`filename`, `extension`, `parent_path`) work on the parts. The type also makes an accidental concatenation of unrelated strings visible.

## Bad

```cpp
#include <fstream>
#include <string>

std::ifstream open_config(const std::string& root, const std::string& name) {
    return std::ifstream(root + "/" + name); // separator guessed by hand
}

int main() {
    return open_config("/etc/app", "config.ini").is_open() ? 0 : 1;
}
```

## Good

```cpp
#include <filesystem>
#include <fstream>
#include <string>

std::ifstream open_config(const std::filesystem::path& root, const std::string& name) {
    return std::ifstream(root / name); // operator/ supplies the separator
}

int main() {
    return open_config("/etc/app", "config.ini").is_open() ? 0 : 1;
}
```

## See Also

- [cpp-sec-path-traversal](sec-path-traversal.md) - what happens when the name comes from outside
- [cpp-io-error-code-overloads](io-error-code-overloads.md) - reporting the failures of these operations
