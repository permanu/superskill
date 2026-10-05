---
id: cpp-ptr-get-observe
lang: cpp
prefix: ptr
title: Treat get() as observation, never as ownership
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unique-ptr, get, observation, ownership]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [get]
related: [cpp-raii-raw-non-owning, cpp-ffi-cpp-calling-c]
sources:
  - title: cppreference - std::unique_ptr
    url: https://en.cppreference.com/w/cpp/memory/unique_ptr
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> get() lends the pointer for inspection; the smart pointer still owns and deletes it.

## Why

R.3 states the convention: a raw pointer is non-owning. The unique_ptr reference documents get() as returning a pointer to the managed object, while the unique_ptr itself owns the object and disposes of it when the unique_ptr goes out of scope. Deleting through the observed pointer gives the allocation two deletes; storing it past the owner's life gives it none. Raw pointers taken from smart pointers are for passing to non-owning interfaces.

## Bad

```cpp
#include <memory>

int main() {
    auto owner = std::make_unique<int>(1);
    delete owner.get(); // the owner will delete it again
    return 0;
}
```

## Good

```cpp
#include <memory>

int use(const int* value) { return *value; }

int main() {
    auto owner = std::make_unique<int>(1);
    const int* raw = owner.get(); // observation only
    return use(raw);
}
```

## See Also

- [cpp-raii-raw-non-owning](raii-raw-non-owning.md) - the convention this rule applies
- [cpp-ffi-cpp-calling-c](ffi-cpp-calling-c.md) - passing observations to C interfaces
