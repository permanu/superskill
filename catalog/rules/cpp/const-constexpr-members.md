---
id: cpp-const-constexpr-members
lang: cpp
prefix: const
title: Mark accessors constexpr so the type works in constant expressions
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constexpr, members, accessors, constant-expressions]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [constexpr]
related: [cpp-perf-constexpr, cpp-const-constinit]
sources:
  - title: cppreference - constexpr specifier
    url: https://en.cppreference.com/w/cpp/language/constexpr
  - title: cppreference - cv type qualifiers
    url: https://en.cppreference.com/w/cpp/language/cv
---
> A constexpr accessor keeps the type usable where constant expressions are required.

## Why

The constexpr reference defines the specifier as declaring that a value can be evaluated at compile time, and such entities can then be used where only constant expressions are allowed. A type whose accessors are constexpr can therefore be constructed and read inside `static_assert`, array bounds, and template arguments — capabilities the type simply does not have when the accessors are left ordinary. Since C++14, constexpr on a member function no longer implies const, so an accessor that does not modify the object marks itself `const`. This is an API property of the type, separate from the performance of precomputing values.

## Bad

```cpp
struct Point {
    int x;
    int y;
    int sum() const { return x + y; } // cannot appear in constant expressions
};

int main() {
    constexpr Point p{1, 2}; // the object can be constexpr
    return p.sum() == 3 ? 0 : 1; // but the accessor runs at run time
}
```

## Good

```cpp
struct Point {
    int x;
    int y;
    constexpr int sum() const { return x + y; } // usable in constant expressions
};

int main() {
    constexpr Point p{1, 2};
    static_assert(p.sum() == 3);
    return 0;
}
```

## See Also

- [cpp-perf-constexpr](perf-constexpr.md) - the performance side of the same specifier
- [cpp-const-constinit](const-constinit.md) - compile-time initialization for globals
