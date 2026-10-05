---
id: cpp-str-byte-vs-char
lang: cpp
prefix: str
title: Use std::byte for bytes that are not characters
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [byte, char, binary, raw-data]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::byte]
related: [cpp-mem-buffer-vector-byte, cpp-str-own-with-string]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::string
    url: https://en.cppreference.com/w/cpp/string/basic_string
---
> char means text; std::byte means storage whose contents are not characters.

## Why

SL.str.5 asks for `std::byte` when referring to byte values that do not necessarily represent characters. A checksum, a nonce, or a serialized field typed as `char` invites the text operations — locale-aware case conversion, string comparisons, formatting as a C string — onto data where none of them are meaningful, and on platforms where `char` is signed the arithmetic differs from the unsigned byte view. `std::byte` states that the value is raw storage and supports bitwise operations without implying a character.

## Bad

```cpp
#include <cstddef>

struct Header {
    char checksum[4]; // not text: raw bytes typed as characters
};

int main() {
    return sizeof(Header) == 4 ? 0 : 1;
}
```

## Good

```cpp
#include <cstddef>

struct Header {
    std::byte checksum[4]; // raw bytes, not characters
};

int main() {
    return sizeof(Header) == 4 ? 0 : 1;
}
```

## See Also

- [cpp-mem-buffer-vector-byte](mem-buffer-vector-byte.md) - byte buffers as containers
- [cpp-str-own-with-string](str-own-with-string.md) - the type to use when it is text
