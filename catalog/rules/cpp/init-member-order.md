---
id: cpp-init-member-order
lang: cpp
prefix: init
title: Write member initializers in declaration order
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [member-initializer-list, initialization-order]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-init-init-not-assign, cpp-init-nsdmi]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Constructors and member initializer lists
    url: https://en.cppreference.com/w/cpp/language/constructor
---
> Initialization runs in declaration order regardless of the order written.

## Why

C.47 asks to define and initialize data members in the order of member declaration. The constructor reference states the rule: the order of member initializers in the list is irrelevant — the actual order is bases first, then non-static data members in order of declaration, then the body. A list written in a different order reads as if one member were initialized from another that has not been constructed yet; the compiler enforces the true order, so the list should say the same thing.

## Bad

```cpp
struct Pair {
    int first;
    int second;
    Pair(int a, int b) : second(b), first(a) {} // list order differs from declaration
};

int main() {
    Pair pair(1, 2);
    return pair.first == 1 ? 0 : 1;
}
```

## Good

```cpp
struct Pair {
    int first;
    int second;
    Pair(int a, int b) : first(a), second(b) {} // matches declaration order
};

int main() {
    Pair pair(1, 2);
    return pair.first == 1 ? 0 : 1;
}
```

## See Also

- [cpp-init-init-not-assign](init-init-not-assign.md) - constructing rather than assigning members
- [cpp-init-nsdmi](init-nsdmi.md) - defaults that skip the list entirely
