---
id: cpp-proj-no-unnamed-header
lang: cpp
prefix: proj
title: Never use an unnamed namespace in a header
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unnamed-namespace, headers, internal-linkage]
  files: ["**/*.hpp", "**/*.h"]
  symbols: []
related: [cpp-proj-unnamed-namespace, cpp-proj-inline-variables]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Namespaces
    url: https://en.cppreference.com/w/cpp/language/namespace
---
> Each translation unit gets its own copy of everything in a header's unnamed namespace.

## Why

SF.21 forbids the unnamed namespace in headers, and the namespace reference explains why: names in an unnamed namespace have internal linkage, and each translation unit's unnamed namespace is a distinct entity even though the unique name is program-wide. A variable placed in a header's unnamed namespace therefore exists once per including translation unit — ten includers, ten counters — and any code that assumes one shared object or one shared address is wrong. Shared state across translation units needs inline functions or inline variables.

## Bad

```cpp
// widget.hpp
namespace {
int widget_count = 0; // one distinct counter per translation unit
}

int main() {
    return widget_count == 0 ? 0 : 1;
}
```

## Good

```cpp
// widget.hpp
inline int& widget_count() { // one counter shared by all translation units
    static int count = 0;
    return count;
}

int main() {
    return widget_count() == 0 ? 0 : 1;
}
```

## See Also

- [cpp-proj-unnamed-namespace](proj-unnamed-namespace.md) - where unnamed namespaces belong
- [cpp-proj-inline-variables](proj-inline-variables.md) - the header-safe sharing mechanism
