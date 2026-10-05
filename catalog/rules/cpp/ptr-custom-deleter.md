---
id: cpp-ptr-custom-deleter
lang: cpp
prefix: ptr
title: Match the deleter to how the resource was created
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unique-ptr, deleter, malloc, resources]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [unique_ptr]
related: [cpp-raii-wrap-resources, cpp-ffi-cpp-calling-c]
sources:
  - title: cppreference - std::unique_ptr
    url: https://en.cppreference.com/w/cpp/memory/unique_ptr
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> unique_ptr deletes by default; resources from other sources need their own releaser.

## Why

R.1 asks to manage resources with resource handles. The unique_ptr reference makes the deleter part of the type: the default, std::default_delete, calls delete, while a custom deleter is stored and invoked instead. A pointer from std::malloc must be paired with std::free — the same matching rule that applies to raw new and delete — and the two-argument unique_ptr constructor is where that pairing is declared.

## Bad

```cpp
#include <cstdlib>
#include <memory>

int main() {
    auto buffer = std::unique_ptr<int>(
        static_cast<int*>(std::malloc(sizeof(int)))); // delete on malloc memory
    return 0;
}
```

## Good

```cpp
#include <cstdlib>
#include <memory>

int main() {
    auto buffer = std::unique_ptr<int, decltype(&std::free)>(
        static_cast<int*>(std::malloc(sizeof(int))), &std::free); // matching deleter
    return buffer ? 0 : 1;
}
```

## See Also

- [cpp-raii-wrap-resources](raii-wrap-resources.md) - the general handle pattern
- [cpp-ffi-cpp-calling-c](ffi-cpp-calling-c.md) - wrapping C resources the same way
