---
id: cpp-ptr-use-count-debug
lang: cpp
prefix: ptr
title: Do not drive logic from use_count
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [shared-ptr, use-count, approximate, ownership]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [use_count]
related: [cpp-raii-weak-break-cycles, cpp-ptr-aliasing-ctor]
sources:
  - title: cppreference - shared_ptr::use_count
    url: https://en.cppreference.com/w/cpp/memory/shared_ptr/use_count
  - title: cppreference - std::shared_ptr
    url: https://en.cppreference.com/w/cpp/memory/shared_ptr
---
> use_count is a diagnostic; it is approximate under concurrency and only 0 is exact.

## Why

The use_count reference states that in a multithreaded environment the value is approximate, because the number of shared owners can change in other threads between the retrieval and the use of the value — and it spells out the trap: use_count returning 1 does not mean the object is safe to modify, because accesses by former owners can still be in flight and new owners can appear concurrently, for example through weak_ptr::lock. Only a return of 0 is accurate. Exclusive access is expressed by unique_ptr and shared read access by shared_ptr<const T>, not by counting owners at run time.

## Bad

```cpp
#include <memory>

int main() {
    auto owner = std::make_shared<int>(1);
    if (owner.use_count() == 1) // approximate, and not a lock
        return *owner;
    return 0;
}
```

## Good

```cpp
#include <memory>

int main() {
    auto owner = std::make_shared<const int>(1); // readers share, no writer role
    return *owner;
}
```

## See Also

- [cpp-raii-weak-break-cycles](raii-weak-break-cycles.md) - control blocks without counting
- [cpp-ptr-aliasing-ctor](ptr-aliasing-ctor.md) - owners that store a different pointer
