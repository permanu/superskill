---
id: cpp-type-regular-value-types
lang: cpp
prefix: type
title: Prefer regular value types; reserve class hierarchies for runtime polymorphism
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [value-semantics, hierarchy, variant, polymorphism]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::variant, virtual]
related: [cpp-type-override, cpp-type-variant-over-union]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::variant
    url: https://en.cppreference.com/w/cpp/utility/variant
---
> Model closed sets of alternatives as value types; use inheritance only for open, runtime polymorphism.

## Why

A hierarchy used for a closed set forces heap allocation, pointer indirection, and reference semantics onto data that behaves like a value: copying needs cloning, comparison needs virtual functions, and ownership needs smart pointers. A `std::variant` of concrete types stays on the stack, copies and compares for free, and its alternatives are checked exhaustively. Hierarchies remain right for open sets extended by third parties and for runtime dispatch through interfaces.

## Bad

```cpp
#include <memory>
#include <vector>

struct Animal {
    virtual ~Animal() = default;
    virtual void speak() const = 0;
};

struct Dog : Animal {
    void speak() const override;
};

int main() {
    std::vector<std::unique_ptr<Animal>> animals; // heap and indirection
    animals.push_back(std::make_unique<Dog>());
}
```

## Good

```cpp
#include <variant>
#include <vector>

struct Dog {
    void speak() const;
};
struct Cat {
    void speak() const;
};

using Animal = std::variant<Dog, Cat>;

int main() {
    std::vector<Animal> animals; // values on the stack
    animals.push_back(Dog{});
    animals.push_back(Cat{});
}
```

## See Also

- [cpp-type-override](type-override.md) - when a hierarchy is the right model
- [cpp-type-variant-over-union](type-variant-over-union.md) - variant as the closed-set type
