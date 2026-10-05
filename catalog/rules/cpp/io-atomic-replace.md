---
id: cpp-io-atomic-replace
lang: cpp
prefix: io
title: Replace a file atomically by renaming a sibling temporary over it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [atomic, rename, replace, crash-safety]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::filesystem::rename]
related: [cpp-io-flush-check, cpp-sec-secure-temp-files]
sources:
  - title: cppreference - std::filesystem::rename
    url: https://en.cppreference.com/w/cpp/filesystem/rename
  - title: cppreference - std::basic_fstream
    url: https://en.cppreference.com/w/cpp/io/basic_fstream
---
> Write the new contents to a temporary sibling, then rename it over the target in one step.

## Why

Opening the target for writing truncates it before the new bytes are known to be complete, so a crash or a concurrent reader sees a partial file. `std::filesystem::rename` replaces an existing non-directory target by first deleting it and then linking the new name, without allowing other processes to observe the target as deleted, which is the atomic swap readers and crash recovery need. Writing the temporary file in the same directory keeps the rename a same-filesystem operation and leaves the original untouched until the final step.

## Bad

```cpp
#include <fstream>

int main() {
    std::ofstream file("state.txt"); // truncated before the new data is complete
    file << "new state\n";
    return 0;
}
```

## Good

```cpp
#include <filesystem>
#include <fstream>

int main() {
    std::ofstream file("state.txt.tmp"); // sibling of the target
    file << "new state\n";
    file.close();
    std::filesystem::rename("state.txt.tmp", "state.txt"); // atomic replacement
    return 0;
}
```

## See Also

- [cpp-io-flush-check](io-flush-check.md) - making sure the temporary is complete before the rename
- [cpp-sec-secure-temp-files](sec-secure-temp-files.md) - creating temporary files that attackers cannot claim
