---
id: cpp-data-delete-operations
lang: cpp
prefix: data
title: Delete unwanted operations explicitly
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [delete, copy-constructor, disabled-operations]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [delete]
related: [cpp-init-defaulted-ctor, cpp-raii-rule-of-five]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Copy constructors
    url: https://en.cppreference.com/w/cpp/language/copy_constructor
---
> = delete says "not available" at the declaration, where callers can see it.

## Why

C.81 asks to use =delete when you want to disable default behavior without wanting an alternative. The copy constructor reference lists the deleted form among the declaration syntaxes — `T(const T&) = delete;` — and its example still shows the older idiom, a private declaration with no definition, labeled non-copyable C++98 style. The deleted function is a declaration the compiler knows about: overload resolution treats it as the best match and reports a clear diagnostic at the call site, while the undefined private one fails later and less clearly.

## Bad

```cpp
struct Widget {
    int id = 0;
    Widget() = default;
private:
    Widget(const Widget&); // declared, not defined: the C++98 way
};

int main() {
    Widget widget;
    return widget.id == 0 ? 0 : 1;
}
```

## Good

```cpp
struct Widget {
    int id = 0;
    Widget() = default;
    Widget(const Widget&) = delete;            // the compiler states the intent
    Widget& operator=(const Widget&) = delete;
};

int main() {
    Widget widget;
    return widget.id == 0 ? 0 : 1;
}
```

## See Also

- [cpp-init-defaulted-ctor](init-defaulted-ctor.md) - the =default counterpart
- [cpp-raii-rule-of-five](raii-rule-of-five.md) - declaring the special members together
