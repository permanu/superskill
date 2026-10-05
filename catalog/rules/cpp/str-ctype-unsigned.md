---
id: cpp-str-ctype-unsigned
lang: cpp
prefix: str
title: Convert to unsigned char before calling the ctype functions
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tolower, ctype, unsigned-char, undefined]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::tolower, std::toupper]
related: [cpp-str-quoted, cpp-type-no-narrowing]
sources:
  - title: cppreference - std::tolower
    url: https://en.cppreference.com/w/cpp/string/byte/tolower
  - title: cppreference - std::string
    url: https://en.cppreference.com/w/cpp/string/basic_string
---
> A negative char value is outside tolower's domain; cast through unsigned char.

## Why

`std::tolower` takes an `int` whose value must be representable as `unsigned char` or equal `EOF`; any other value — which includes a negative `char` on platforms where `char` is signed — is undefined behavior. The reference's note gives the exact fix: convert the argument to `unsigned char` before the call, and do the same inside standard algorithms, because their `char` elements carry the same hazard. The cast is not cosmetic; it defines the domain.

## Bad

```cpp
#include <cctype>
#include <string>

std::string lower(const std::string& text) {
    std::string result = text;
    for (char& c : result)
        c = static_cast<char>(std::tolower(c)); // negative char is undefined
    return result;
}

int main() {
    return lower("ABC") == "abc" ? 0 : 1;
}
```

## Good

```cpp
#include <cctype>
#include <string>

std::string lower(const std::string& text) {
    std::string result = text;
    for (char& c : result)
        c = static_cast<char>(std::tolower(static_cast<unsigned char>(c))); // defined
    return result;
}

int main() {
    return lower("ABC") == "abc" ? 0 : 1;
}
```

## See Also

- [cpp-str-quoted](str-quoted.md) - another byte-level text operation with strict rules
- [cpp-type-no-narrowing](type-no-narrowing.md) - the same attention to value domains
