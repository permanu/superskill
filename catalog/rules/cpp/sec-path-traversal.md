---
id: cpp-sec-path-traversal
lang: cpp
prefix: sec
title: Canonicalize and confine untrusted paths before opening them
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [path, traversal, canonical, filesystem]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::filesystem::canonical]
related: [cpp-sec-no-command-injection, cpp-io-no-toctou]
sources:
  - title: "CWE-22: Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal')"
    url: https://cwe.mitre.org/data/definitions/22.html
  - title: cppreference - std::filesystem::path
    url: https://en.cppreference.com/w/cpp/filesystem/path
---
> Resolve the path, then verify it is still inside the directory you meant to serve.

## Why

Appending input to a directory prefix is not confinement: `../` sequences and absolute paths both resolve outside it, and CWE-22 records file reads, overwrites, and code execution reached this way. `std::filesystem::canonical` removes `.`, `..`, and symlinks and yields an absolute path; comparing the result against the canonical root with a path-separator boundary turns traversal into a rejected request. Checking only the prefix string is not enough, because `root / name` discards the root when `name` is absolute.

## Bad

```cpp
#include <fstream>
#include <string>

std::ifstream open_profile(const std::string& name) {
    return std::ifstream("/srv/profiles/" + name); // "../" escapes the directory
}

int main() {
    return open_profile("../../etc/passwd").is_open() ? 0 : 1;
}
```

## Good

```cpp
#include <filesystem>
#include <fstream>
#include <stdexcept>
#include <string>

std::ifstream open_profile(const std::string& name) {
    const std::filesystem::path root = std::filesystem::canonical("/srv/profiles");
    const std::filesystem::path file = std::filesystem::canonical(root / name);
    if (!file.string().starts_with(root.string() + "/"))
        throw std::invalid_argument("path escapes the profile root");
    return std::ifstream(file);
}

int main() {
    return open_profile("../../etc/passwd").is_open() ? 0 : 1;
}
```

## See Also

- [cpp-sec-no-command-injection](sec-no-command-injection.md) - the shell variant of the same mistake
- [cpp-io-no-toctou](io-no-toctou.md) - rechecking after the path is resolved
