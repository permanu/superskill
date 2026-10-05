---
id: cpp-raii-make-unique
lang: cpp
prefix: raii
title: Create smart pointers with make_unique or make_shared, never from a raw new expression
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [make_unique, make_shared, exception-safety, allocation]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::make_unique, std::make_shared]
related: [cpp-raii-no-naked-new, cpp-raii-unique-default]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::make_unique
    url: https://en.cppreference.com/w/cpp/memory/unique_ptr/make_unique
  - title: cppreference - std::unique_ptr
    url: https://en.cppreference.com/w/cpp/memory/unique_ptr
---
> Build owners with make_unique or make_shared so no raw owning pointer exists at any point.

## Why

R.23's exception-safety note applied to older code: under the current language rules, function-argument evaluation is indeterminately sequenced, so the exception-safety gap that rationale once described no longer exists for the pattern shown. The reasons that remain are the ones to enforce: no naked `new`, no raw owning pointer at any point, the type named once, and exception safety wherever an owning raw pointer still exists before ownership is transferred, such as a factory that calls a throwing function between the allocation and the `unique_ptr` construction. `make_shared` also allocates the object and its control block in a single allocation.

## Bad

```cpp
#include <memory>

struct Widget {
    Widget(int width, int height);
    void configure();
};

std::unique_ptr<Widget> make_widget(int width, int height) {
    Widget* raw = new Widget(width, height); // raw owning pointer
    raw->configure();                        // if this throws, raw leaks
    return std::unique_ptr<Widget>(raw);
}
```

## Good

```cpp
#include <memory>

struct Widget {
    Widget(int width, int height);
    void configure();
};

std::unique_ptr<Widget> make_widget(int width, int height) {
    auto widget = std::make_unique<Widget>(width, height); // owner exists first
    widget->configure();                                   // throwing here is safe
    return widget;
}
```

## See Also

- [cpp-raii-no-naked-new](raii-no-naked-new.md) - the broader no-new/delete rule
- [cpp-raii-unique-default](raii-unique-default.md) - choosing between unique and shared ownership
