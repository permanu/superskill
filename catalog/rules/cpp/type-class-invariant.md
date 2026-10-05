---
id: cpp-type-class-invariant
lang: cpp
prefix: type
title: Use class with private data when there is an invariant; use struct only for independent data
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [invariant, encapsulation, class, struct]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [class, struct]
related: [cpp-type-strong-types, cpp-type-parse-at-boundary]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Hide data behind a constructor when the members must satisfy a condition; leave aggregates public only when they do not.

## Why

An invariant is a condition every member function assumes, such as month between 1 and 12. Public data lets any caller break it and every function must then re-check, which means some function will not. A constructor establishes the invariant once, private data keeps it, and member functions can rely on it. When the members genuinely vary independently, a plain aggregate is simpler and no invariant exists to protect.

## Bad

```cpp
struct Date {
    int year;
    int month;
    int day; // nothing prevents month 13 or day 0
};

int main() {
    Date date{2026, 13, 0};
    (void)date;
}
```

## Good

```cpp
#include <stdexcept>

class Date {
public:
    Date(int year, int month, int day) : year_(year), month_(month), day_(day) {
        if (month_ < 1 || month_ > 12 || day_ < 1 || day_ > 31)
            throw std::invalid_argument("invalid date");
    }
    int year() const { return year_; }
    int month() const { return month_; }
    int day() const { return day_; }
private:
    int year_;
    int month_;
    int day_;
};

int main() {
    Date date{2026, 10, 4};
    (void)date;
}
```

## See Also

- [cpp-type-strong-types](type-strong-types.md) - types that make invalid arguments unrepresentable
- [cpp-type-parse-at-boundary](type-parse-at-boundary.md) - establishing the invariant at the edge
