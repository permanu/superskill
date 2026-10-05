---
id: cpp-const-ref-lifetime
lang: cpp
prefix: const
title: Never return a reference bound to a temporary
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [reference, temporary, lifetime, dangling]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-str-view-lifetime, cpp-const-ref-params]
sources:
  - title: cppreference - Reference initialization
    url: https://en.cppreference.com/w/cpp/language/reference_initialization
  - title: cppreference - const_cast conversion
    url: https://en.cppreference.com/w/cpp/language/const_cast
---
> Lifetime extension stops at the return statement and at the function call.

## Why

The reference-initialization page states the lifetime-extension rule and then lists its exceptions: a temporary bound to a return value in a `return` statement is not extended — it is destroyed at the end of the return expression, so such a statement always returns a dangling reference; a temporary bound to a reference parameter lasts only until the end of the full expression containing the call, so a function returning it also dangles; and in general lifetime cannot be extended by "passing it on". A function that needs to give out a value returns it by value or refers to an object the caller owns.

## Bad

```cpp
#include <string>

const std::string& label() {
    return "service"; // temporary destroyed at the end of the return
}

int main() {
    return label() == "service" ? 0 : 1; // reads through a dangling reference
}
```

## Good

```cpp
#include <string>

std::string label() {
    return "service"; // returned by value
}

int main() {
    return label() == "service" ? 0 : 1;
}
```

## See Also

- [cpp-str-view-lifetime](str-view-lifetime.md) - the same rule for views
- [cpp-const-ref-params](const-ref-params.md) - where const references are safe
