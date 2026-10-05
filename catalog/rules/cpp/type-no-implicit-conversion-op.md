---
id: cpp-type-no-implicit-conversion-op
lang: cpp
prefix: type
title: Avoid implicit conversion operators; expose an accessor or an explicit operator
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [conversion-operator, explicit, accessor]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [operator bool, explicit]
related: [cpp-type-explicit-ctor, cpp-type-strong-types]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - explicit specifier
    url: https://en.cppreference.com/w/cpp/language/explicit
---
> Do not let class types convert to unrelated types implicitly; name the conversion instead.

## Why

An implicit conversion operator lets a value leave its domain silently: a temperature multiplies as a plain number, a smart handle decays to a raw pointer, a status compares as a boolean. Overload resolution then selects operations the class never intended, and each new overload changes the meaning of existing expressions. A named accessor makes the conversion visible at the call site; an `explicit operator` keeps it available for deliberate casts only.

## Bad

```cpp
class Celsius {
public:
    Celsius(double degrees) : degrees_(degrees) {}
    operator double() const { return degrees_; } // silent conversion
private:
    double degrees_;
};

int main() {
    Celsius temperature{21.5};
    const double doubled = temperature * 2; // becomes a double silently
    (void)doubled;
}
```

## Good

```cpp
class Celsius {
public:
    explicit Celsius(double degrees) : degrees_(degrees) {}
    double degrees() const { return degrees_; }
private:
    double degrees_;
};

int main() {
    const Celsius temperature{21.5};
    const double doubled = temperature.degrees() * 2; // intent is visible
    (void)doubled;
}
```

## See Also

- [cpp-type-explicit-ctor](type-explicit-ctor.md) - the constructor side of the same problem
- [cpp-type-strong-types](type-strong-types.md) - keeping values inside their domain
