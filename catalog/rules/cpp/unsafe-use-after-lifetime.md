---
id: cpp-unsafe-use-after-lifetime
lang: cpp
prefix: unsafe
title: Do not use an object after its lifetime ends
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [lifetime, use-after-free, dangling]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [free]
related: [cpp-unsafe-return-local-address, cpp-raii-wrap-resources]
sources:
  - title: cppreference - Lifetime
    url: https://en.cppreference.com/w/cpp/language/lifetime
  - title: cppreference - Undefined behavior
    url: https://en.cppreference.com/w/cpp/language/ub
---
> Released or destroyed storage no longer holds the object the pointer names.

## Why

The lifetime reference defines when lifetime ends — for a non-class object it is destroyed, for a class object its destructor call starts, and it also ends when the storage is released or reused — and its "Access outside of lifetime" section marks the uses of such a glvalue as undefined: lvalue-to-rvalue conversion, member access, member calls, dynamic_cast, and typeid. A pointer that outlives its object keeps the address but not an object to read. RAII handles end the lifetime exactly when the last owner is done.

## Bad

```cpp
#include <cstdlib>

int main() {
    int* value = static_cast<int*>(std::malloc(sizeof(int)));
    *value = 1;
    std::free(value);
    return *value; // the object's lifetime ended with the free
}
```

## Good

```cpp
#include <memory>

int main() {
    auto value = std::make_unique<int>(1);
    return *value; // alive until the owner dies
}
```

## See Also

- [cpp-unsafe-return-local-address](unsafe-return-local-address.md) - the automatic-storage form
- [cpp-raii-wrap-resources](raii-wrap-resources.md) - making the end of lifetime automatic
