---
id: cpp-unsafe-return-local-address
lang: cpp
prefix: unsafe
title: Never return the address of a local object
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dangling-pointer, return, stack-address, lifetime]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [return]
related: [cpp-const-ref-lifetime, cpp-unsafe-use-after-lifetime]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Lifetime
    url: https://en.cppreference.com/w/cpp/language/lifetime
---
> The local dies at the closing brace; the returned pointer has nothing left to name.

## Why

ES.65 asks not to dereference an invalid pointer, and a pointer to a local whose scope has exited is exactly that. The lifetime reference records the end of lifetime for automatic objects when their scope exits: the pointer keeps the old address, but the object is gone, so any later read is an access outside the lifetime and undefined. Returning by value — or returning an owning handle — keeps the result alive without an address to track.

## Bad

```cpp
int* make_value() {
    int value = 42;
    return &value; // the local dies at the return
}

int main() {
    return *make_value() == 42 ? 0 : 1;
}
```

## Good

```cpp
#include <memory>

std::unique_ptr<int> make_value() {
    return std::make_unique<int>(42);
}

int main() {
    return *make_value() == 42 ? 0 : 1;
}
```

## See Also

- [cpp-const-ref-lifetime](const-ref-lifetime.md) - the reference-return form of the same defect
- [cpp-unsafe-use-after-lifetime](unsafe-use-after-lifetime.md) - the general lifetime rule
