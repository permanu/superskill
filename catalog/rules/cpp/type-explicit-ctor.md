---
id: cpp-type-explicit-ctor
lang: cpp
prefix: type
title: Declare single-argument constructors explicit by default
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [explicit, constructor, implicit-conversion]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [explicit]
related: [cpp-type-no-implicit-conversion-op, cpp-type-strong-types]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - explicit specifier
    url: https://en.cppreference.com/w/cpp/language/explicit
---
> Mark single-argument constructors explicit so values do not convert to class types by accident.

## Why

A non-explicit single-argument constructor makes the type implicitly convertible from its argument: integers silently become distances, strings become file paths, and overload resolution picks conversions the caller never intended. `explicit` keeps direct initialization working while rejecting the invisible conversion. The exception is a type whose entire purpose is to be the argument, such as a transparent wrapper.

## Bad

```cpp
class Distance {
public:
    Distance(int meters) : meters_(meters) {} // implicit conversion
    int meters() const { return meters_; }
private:
    int meters_;
};

int main() {
    Distance d = 42; // int silently becomes Distance
    (void)d;
}
```

## Good

```cpp
class Distance {
public:
    explicit Distance(int meters) : meters_(meters) {}
    int meters() const { return meters_; }
private:
    int meters_;
};

int main() {
    Distance d{42}; // direct initialization still works
    (void)d;
}
```

## See Also

- [cpp-type-no-implicit-conversion-op](type-no-implicit-conversion-op.md) - the conversion-function side of the same problem
- [cpp-type-strong-types](type-strong-types.md) - distinct types make explicit construction meaningful
