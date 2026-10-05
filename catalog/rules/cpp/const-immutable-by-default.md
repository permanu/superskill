---
id: cpp-const-immutable-by-default
lang: cpp
prefix: const
title: Make objects immutable by default
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [const, immutability, objects, variables]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [const]
related: [cpp-const-member-functions, cpp-const-ref-params]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - cv type qualifiers
    url: https://en.cppreference.com/w/cpp/language/cv
---
> const turns "this never changes" from a belief into a checked fact.

## Why

Con.1 asks to make objects immutable by default, and Con.4 to use `const` for objects with values that do not change after construction. The cv reference defines the effect: a const object cannot be modified — a direct attempt is a compile-time error, and an indirect attempt through a non-const path is undefined behavior. Declaring the object const moves the assumption into the type system, where every later change to it is caught at the point of the mistake instead of being audited by hand.

## Bad

```cpp
#include <string>

int main() {
    std::string name = "service"; // never changes after this line
    return name.size() == 7 ? 0 : 1;
}
```

## Good

```cpp
#include <string>

int main() {
    const std::string name = "service"; // immutable by default
    return name.size() == 7 ? 0 : 1;
}
```

## See Also

- [cpp-const-member-functions](const-member-functions.md) - the same default for member functions
- [cpp-const-ref-params](const-ref-params.md) - the same default for parameters
