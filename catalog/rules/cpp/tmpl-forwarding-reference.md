---
id: cpp-tmpl-forwarding-reference
lang: cpp
prefix: tmpl
title: Forward values through templates with T&& and std::forward
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [forwarding-reference, perfect-forwarding, deduction]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [forward]
related: [cpp-tmpl-forwarding-greedy, cpp-perf-sink-move]
sources:
  - title: cppreference - Template argument deduction
    url: https://en.cppreference.com/w/cpp/language/template_argument_deduction
  - title: cppreference - Templates
    url: https://en.cppreference.com/w/cpp/language/templates
---
> T&& deduces the value category; std::forward preserves it.

## Why

The deduction reference spells out the special rule: when P is an rvalue reference to a cv-unqualified template parameter — a forwarding reference — and the argument is an lvalue, the type lvalue reference to A is used in place of A for deduction, which is the basis for the action of std::forward. A plain const& parameter erases the distinction and forces a copy; a forwarding reference passes lvalues as lvalues and rvalues as rvalues, so the receiving code can move when it may and copy only when it must.

## Bad

```cpp
#include <string>

template <class T>
void consume(const T& value) { // cannot take ownership; forces a copy
    std::string local = value;
    (void)local;
}

int main() {
    std::string name = "a";
    consume(name);
    consume(std::string{"b"}); // copied, not moved
    return 0;
}
```

## Good

```cpp
#include <string>
#include <utility>

template <class T>
void consume(T&& value) { // forwarding reference
    std::string local = std::forward<T>(value); // keeps the value category
    (void)local;
}

int main() {
    std::string name = "a";
    consume(name);             // T = std::string&
    consume(std::string{"b"}); // T = std::string
    return 0;
}
```

## See Also

- [cpp-tmpl-forwarding-greedy](tmpl-forwarding-greedy.md) - the overload hazard this creates
- [cpp-perf-sink-move](perf-sink-move.md) - moving into storage at the last step
