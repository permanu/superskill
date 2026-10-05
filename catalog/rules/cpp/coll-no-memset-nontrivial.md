---
id: cpp-coll-no-memset-nontrivial
lang: cpp
prefix: coll
title: Never memset or memcpy non-trivially-copyable objects
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [memset, memcpy, trivially-copyable, invariants]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::memset, std::memcpy]
related: [cpp-type-regular-value-types, cpp-sec-no-type-punning]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::string
    url: https://en.cppreference.com/w/cpp/string/basic_string
---
> Byte operations know nothing of constructors, pointers, or invariants.

## Why

SL.con.4 states the rule directly: don't use `memset` or `memcpy` for arguments that are not trivially-copyable. A type with constructors and a destructor — a string, a vector, a smart pointer — holds resources and maintains invariants that byte-wise writes destroy: the owned pointer is overwritten, the length no longer matches the buffer, and the destructor later acts on garbage. Such types provide operations for the effects that are legal; use those.

## Bad

```cpp
#include <cstring>
#include <string>

int main() {
    std::string name = "service";
    std::memset(&name, 0, sizeof(name)); // overwrites a non-trivial object
    return 0;
}
```

## Good

```cpp
#include <string>

int main() {
    std::string name = "service";
    name.clear(); // the type's own operation
    return name.empty() ? 0 : 1;
}
```

## See Also

- [cpp-type-regular-value-types](type-regular-value-types.md) - value types with real operations
- [cpp-sec-no-type-punning](sec-no-type-punning.md) - the same byte-level hazard in casts
