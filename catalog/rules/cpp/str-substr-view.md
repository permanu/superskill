---
id: cpp-str-substr-view
lang: cpp
prefix: str
title: Extract substrings as views when a copy is not needed
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [substr, string_view, substring, copy]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [substr]
related: [cpp-str-view-lifetime, cpp-str-npos-check]
sources:
  - title: cppreference - std::basic_string_view
    url: https://en.cppreference.com/w/cpp/string/basic_string_view
  - title: cppreference - std::string
    url: https://en.cppreference.com/w/cpp/string/basic_string
---
> substr on a string allocates a copy; substr on a view returns another view.

## Why

`std::string::substr` constructs a new string, which allocates and copies the characters; `std::basic_string_view::substr` returns a view of the same buffer with an adjusted pointer and length. For scanning, tokenizing, and passing pieces to functions that only read, the view does the same job without the allocation, and the caller keeps ownership of the original. The lifetime rules of views still apply, so the extracted piece is only as good as the string it came from.

## Bad

```cpp
#include <string>

std::string domain(const std::string& email) {
    return email.substr(email.find('@') + 1); // copies the suffix
}

int main() {
    return domain("user@example.com") == "example.com" ? 0 : 1;
}
```

## Good

```cpp
#include <string>
#include <string_view>

std::string_view domain(std::string_view email) {
    return email.substr(email.find('@') + 1); // views the suffix
}

int main() {
    const std::string email = "user@example.com";
    return domain(email) == "example.com" ? 0 : 1;
}
```

## See Also

- [cpp-str-view-lifetime](str-view-lifetime.md) - the lifetime contract that makes views safe
- [cpp-str-npos-check](str-npos-check.md) - validating the position before slicing
