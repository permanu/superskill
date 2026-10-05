---
id: cpp-ptr-release-handoff
lang: cpp
prefix: ptr
title: Pair release() with an immediate new owner
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unique-ptr, release, ownership, leak]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [release]
related: [cpp-raii-return-by-value, cpp-ptr-get-observe]
sources:
  - title: cppreference - std::unique_ptr
    url: https://en.cppreference.com/w/cpp/memory/unique_ptr
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> release() empties the unique_ptr and hands the caller an owning raw pointer.

## Why

The unique_ptr reference defines release(): it returns a pointer to the managed object and releases the ownership, leaving the unique_ptr empty. Nothing deletes the object after that — the returned pointer is now an owning raw pointer, the exact thing R.3 warns about — so a discarded result is a leak. Moving the unique_ptr transfers ownership without exposing a raw pointer; reset() destroys the object in place.

## Bad

```cpp
#include <memory>

int main() {
    auto owner = std::make_unique<int>(1);
    owner.release(); // ownership handed to nobody
    return 0; // the int leaks
}
```

## Good

```cpp
#include <memory>
#include <utility>

std::unique_ptr<int> adopt(std::unique_ptr<int> value) { return value; }

int main() {
    auto owner = std::make_unique<int>(1);
    auto moved = adopt(std::move(owner)); // ownership transferred
    return *moved;
}
```

## See Also

- [cpp-raii-return-by-value](raii-return-by-value.md) - moving owners through interfaces
- [cpp-ptr-get-observe](ptr-get-observe.md) - the non-owning way to expose a pointer
