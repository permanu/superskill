---
id: cpp-str-npos-check
lang: cpp
prefix: str
title: Check find results against npos before using them
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [find, npos, substring, search]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::string::npos]
related: [cpp-str-starts-with, cpp-sec-bounds-checked]
sources:
  - title: cppreference - std::string
    url: https://en.cppreference.com/w/cpp/string/basic_string
  - title: cppreference - std::basic_string_view
    url: https://en.cppreference.com/w/cpp/string/basic_string_view
---
> A failed search returns npos, the largest size_type; arithmetic on it wraps.

## Why

`find` and its siblings report failure with `npos`, which the reference defines as the special value `size_type(-1)`, the largest representable size. Used as an index, it is a position past the end; used in arithmetic, `npos + 1` wraps to zero, so `substr(pos + 1)` silently returns the whole string instead of failing. The check against `npos` is the only thing separating "found at the end" from "not found".

## Bad

```cpp
#include <string>

int main() {
    const std::string line = "key=value";
    const std::size_t separator = line.find('=');
    return line.substr(separator + 1) == "value" ? 0 : 1; // npos + 1 wraps
}
```

## Good

```cpp
#include <string>

int main() {
    const std::string line = "key=value";
    const std::size_t separator = line.find('=');
    if (separator == std::string::npos)
        return 1;
    return line.substr(separator + 1) == "value" ? 0 : 1;
}
```

## See Also

- [cpp-str-starts-with](str-starts-with.md) - predicates that avoid the index entirely
- [cpp-sec-bounds-checked](sec-bounds-checked.md) - rejecting bad positions at the boundary
