---
id: cpp-str-view-lifetime
lang: cpp
prefix: str
title: A string_view must not outlive the characters it views
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [string_view, lifetime, dangling, view]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::string_view]
related: [cpp-str-own-with-string, cpp-str-view-invalidation]
sources:
  - title: cppreference - std::basic_string_view
    url: https://en.cppreference.com/w/cpp/string/basic_string_view
  - title: cppreference - std::string
    url: https://en.cppreference.com/w/cpp/string/basic_string
---
> A view is a pointer and a length; it neither owns nor extends the characters' lifetime.

## Why

`std::basic_string_view` refers to a contiguous sequence of characters without owning them, so returning a view of a local string, or keeping one past the string's destruction, leaves the view pointing at freed storage. The reference notes it is the programmer's responsibility to ensure that the underlying character array outlives the view. Views are safe exactly where the borrowed string outlives every use, which is why they work well as parameters and badly as escape hatches from a scope.

## Bad

```cpp
#include <string>
#include <string_view>

std::string_view first_word() {
    const std::string text = "hello world";
    return std::string_view(text).substr(0, 5); // views a dead local
}

int main() {
    return first_word() == "hello" ? 0 : 1;
}
```

## Good

```cpp
#include <string>
#include <string_view>

std::string_view first_word(std::string_view text) {
    return text.substr(0, text.find(' ')); // views the caller's storage
}

int main() {
    const std::string text = "hello world";
    return first_word(text) == "hello" ? 0 : 1;
}
```

## See Also

- [cpp-str-own-with-string](str-own-with-string.md) - the owner that keeps the characters alive
- [cpp-str-view-invalidation](str-view-invalidation.md) - modification invalidates views too
