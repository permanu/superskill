---
id: cpp-sec-safe-string-functions
lang: cpp
prefix: sec
title: No unbounded string copies; let std::string own the bytes
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [strcpy, overflow, string, buffer]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::strcpy, std::string]
related: [cpp-sec-bounds-checked, cpp-type-string-view]
sources:
  - title: "CWE-120: Buffer Copy without Checking Size of Input ('Classic Buffer Overflow')"
    url: https://cwe.mitre.org/data/definitions/120.html
  - title: cppreference - std::string
    url: https://en.cppreference.com/w/cpp/string/basic_string
---
> Copy strings with types that grow to fit; fixed buffers plus unbounded copy functions overflow.

## Why

`strcpy`, `strcat`, and `sprintf` copy until the source ends, with no knowledge of the destination's size; CWE-120 is the resulting overflow, where input longer than the buffer overwrites adjacent memory. `std::string` sizes itself to the data, owns its storage, and grows on demand, so there is no length the caller can get wrong. Where a fixed-size destination is unavoidable, use a copy function that takes the size and verify the result.

## Bad

```cpp
#include <cstring>

void copy_name(char* destination, const char* source) {
    std::strcpy(destination, source); // no limit: long input overflows
}

int main() {
    char name[8];
    copy_name(name, "a-very-long-hostname");
    return name[0] == '\0';
}
```

## Good

```cpp
#include <string>

std::string copy_name(const char* source) {
    return std::string(source); // grows to fit and owns the storage
}

int main() {
    const std::string name = copy_name("a-very-long-hostname");
    return name.empty() ? 1 : 0;
}
```

## See Also

- [cpp-sec-bounds-checked](sec-bounds-checked.md) - the same discipline for indexed access
- [cpp-type-string-view](type-string-view.md) - read-only views that never copy at all
