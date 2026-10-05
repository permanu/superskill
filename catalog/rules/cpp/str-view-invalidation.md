---
id: cpp-str-view-invalidation
lang: cpp
prefix: str
title: Do not hold a view or pointer into a string that may be modified
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [string, invalidation, string_view, reallocation]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::string_view]
related: [cpp-str-view-lifetime, cpp-str-cstr-boundary]
sources:
  - title: cppreference - std::string
    url: https://en.cppreference.com/w/cpp/string/basic_string
  - title: cppreference - std::basic_string_view
    url: https://en.cppreference.com/w/cpp/string/basic_string_view
---
> Non-const string operations may reallocate; pointers, iterators, and views go stale.

## Why

The reference states that references, pointers, and iterators into a `basic_string` may be invalidated by any standard library function taking a non-const reference to it, and by its non-const member functions, with only a short list of exceptions. A `string_view` is built from exactly those pointers, so a modification that reallocates leaves the view pointing at the old buffer. The safe order is to finish modifying the string, then take the view.

## Bad

```cpp
#include <string>
#include <string_view>

int main() {
    std::string text = "hello";
    const std::string_view view = text;
    text += ", world"; // may reallocate and invalidate the view
    return view.size() == 5 ? 0 : 1;
}
```

## Good

```cpp
#include <string>
#include <string_view>

int main() {
    std::string text = "hello";
    text += ", world"; // finish the modifications first
    const std::string_view view = text;
    return view.size() == 12 ? 0 : 1;
}
```

## See Also

- [cpp-str-view-lifetime](str-view-lifetime.md) - the destruction case of the same hazard
- [cpp-str-cstr-boundary](str-cstr-boundary.md) - the same rule for c_str pointers
