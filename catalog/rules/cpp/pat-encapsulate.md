---
id: cpp-pat-encapsulate
lang: cpp
prefix: pat
title: Encapsulate messy constructs behind an interface
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [encapsulation, interfaces, abstractions]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-api-pimpl, cpp-raii-wrap-resources]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - PImpl
    url: https://en.cppreference.com/w/cpp/language/pimpl
---
> Wrap the awkward mechanism once; callers see one well-behaved operation.

## Why

P.11 asks to encapsulate messy constructs rather than spreading them through the code. The pimpl reference describes the same instinct at the type level: separating the interface from the implementation so that the awkward parts stay behind a boundary. Low-level resource handling — open, check, use, close — is the classic case: written inline it is repeated at every call site with every check, and one missed branch leaks; written once as a function or type, it is tested once and the callers see a single verb.

## Bad

```cpp
#include <cstdio>

int main() {
    std::FILE* file = std::fopen("data.txt", "w"); // the details live at the call site
    if (file == nullptr)
        return 1;
    std::fputs("hello", file);
    std::fclose(file);
    return 0;
}
```

## Good

```cpp
#include <cstdio>

bool write_text(const char* path, const char* text) { // the mess lives here, once
    std::FILE* file = std::fopen(path, "w");
    if (file == nullptr)
        return false;
    const bool ok = std::fputs(text, file) >= 0;
    std::fclose(file);
    return ok;
}

int main() {
    return write_text("data.txt", "hello") ? 0 : 1;
}
```

## See Also

- [cpp-api-pimpl](api-pimpl.md) - hiding implementation behind the class boundary
- [cpp-raii-wrap-resources](raii-wrap-resources.md) - giving the wrapped resource an owner
