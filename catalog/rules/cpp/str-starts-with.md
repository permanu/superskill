---
id: cpp-str-starts-with
lang: cpp
prefix: str
title: Use the named string predicates instead of compare and find arithmetic
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [starts_with, ends_with, contains, compare]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [starts_with, ends_with]
related: [cpp-str-npos-check, cpp-str-own-with-string]
sources:
  - title: cppreference - std::string
    url: https://en.cppreference.com/w/cpp/string/basic_string
  - title: cppreference - std::basic_string_view
    url: https://en.cppreference.com/w/cpp/string/basic_string_view
---
> starts_with, ends_with, and contains say what they test; compare needs position math.

## Why

The standard string types provide `starts_with`, `ends_with`, and `contains` as named operations: the first two check a prefix or suffix directly, and `contains` answers existence without exposing an index. The older idioms — `compare(0, prefix.size(), prefix)`, or a `find` result compared against `npos` — make the caller compute lengths and offsets, which is where the off-by-one and the `npos` mistakes live. The predicates also work identically on strings and views.

## Bad

```cpp
#include <string>

bool is_header(const std::string& line) {
    return line.compare(0, 2, "# ") == 0; // hand-built prefix check
}

int main() {
    return is_header("# note") ? 0 : 1;
}
```

## Good

```cpp
#include <string>

bool is_header(const std::string& line) {
    return line.starts_with("# "); // named predicate
}

int main() {
    return is_header("# note") ? 0 : 1;
}
```

## See Also

- [cpp-str-npos-check](str-npos-check.md) - the failure value these predicates avoid
- [cpp-str-own-with-string](str-own-with-string.md) - the owning type they operate on
