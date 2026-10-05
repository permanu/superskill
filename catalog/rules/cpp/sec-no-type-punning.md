---
id: cpp-sec-no-type-punning
lang: cpp
prefix: sec
title: Never reinterpret memory as an unrelated type; use bit_cast
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [reinterpret_cast, aliasing, type-confusion, bit_cast]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [reinterpret_cast, std::bit_cast]
related: [cpp-type-variant-over-union, cpp-sec-bounds-checked]
sources:
  - title: "CWE-843: Access of Resource Using Incompatible Type ('Type Confusion')"
    url: https://cwe.mitre.org/data/definitions/843.html
  - title: cppreference - std::bit_cast
    url: https://en.cppreference.com/w/cpp/numeric/bit_cast
---
> Convert representations with bit_cast; pointer casts that alias the bytes are undefined behavior.

## Why

CWE-843 describes how reading memory through an incompatible type makes the object's properties wrong: with untrusted data driving the reinterpretation, an attacker can turn a parsed field into an out-of-bounds access or a corrupted pointer. The type aliasing rule makes the pointer form undefined behavior even before security enters; `std::bit_cast` reinterprets the object representation in a defined way and participates only for trivially copyable types of equal size.

## Bad

```cpp
#include <cstdint>

float read_float(const std::uint32_t* word) {
    return *reinterpret_cast<const float*>(word); // aliasing violation
}

int main() {
    const std::uint32_t bits = 0x3f800000;
    return read_float(&bits) == 1.0f ? 0 : 1;
}
```

## Good

```cpp
#include <bit>
#include <cstdint>

float read_float(const std::uint32_t* word) {
    return std::bit_cast<float>(*word); // defined bit reinterpretation
}

int main() {
    const std::uint32_t bits = 0x3f800000;
    return read_float(&bits) == 1.0f ? 0 : 1;
}
```

## See Also

- [cpp-type-variant-over-union](type-variant-over-union.md) - tagged representations without aliasing
- [cpp-sec-bounds-checked](sec-bounds-checked.md) - the access that type confusion usually corrupts
