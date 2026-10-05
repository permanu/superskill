---
id: cpp-type-variant-over-union
lang: cpp
prefix: type
title: Model closed alternatives with std::variant instead of a raw union and a tag
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [variant, union, alternatives, tagged]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::variant, union]
related: [cpp-type-enum-class, cpp-type-strong-types]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::variant
    url: https://en.cppreference.com/w/cpp/utility/variant
---
> Represent a value that is one of several types with std::variant, not a hand-rolled tagged union.

## Why

A raw union plus a tag makes the active member a comment: nothing stops reading the wrong member, non-trivial members require manual construction and destruction, and copy/move/destruction must be written by hand. `std::variant` tracks the active alternative, runs the right destructor, and rejects wrong-member access with a checked interface, while `std::visit` forces every alternative to be handled.

## Bad

```cpp
struct Value {
    enum class Kind { integer, text } kind;
    union {
        int integer;
        const char* text;
    };
};

int main() {
    Value value{};
    value.kind = Value::Kind::text;
    value.integer = 42; // wrong member, silently corrupts the value
}
```

## Good

```cpp
#include <string>
#include <variant>

using Value = std::variant<int, std::string>;

int main() {
    Value value = 42;
    value = std::string("hello");
}
```

## See Also

- [cpp-type-enum-class](type-enum-class.md) - scoped alternatives when only names are needed
- [cpp-type-strong-types](type-strong-types.md) - types that make wrong-member use impossible
