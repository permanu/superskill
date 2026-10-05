---
id: cpp-ptr-weak-lock
lang: cpp
prefix: ptr
title: Promote weak_ptr with lock and test the result
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [weak-ptr, lock, expiration, observation]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [lock]
related: [cpp-raii-weak-break-cycles, cpp-ptr-enable-shared-from-this]
sources:
  - title: cppreference - std::weak_ptr
    url: https://en.cppreference.com/w/cpp/memory/weak_ptr
  - title: cppreference - std::shared_ptr
    url: https://en.cppreference.com/w/cpp/memory/shared_ptr
---
> A weak_ptr cannot be read; lock() returns an owner or an empty pointer.

## Why

The weak_ptr reference states that it holds a non-owning reference which must be converted to std::shared_ptr in order to access the referenced object, and that conversion is lock(). The page's own example promotes the observer inside an if condition — `if (std::shared_ptr<int> spt = gw.lock())` — because the object can expire at any time and lock returns an empty shared_ptr then; dereferencing that empty result is the same undefined null access as anywhere else. The promoted owner also keeps the object alive for the duration of the use.

## Bad

```cpp
#include <memory>

int main() {
    std::weak_ptr<int> observer;
    {
        auto owner = std::make_shared<int>(1);
        observer = owner;
    } // the owner dies here
    std::shared_ptr<int> locked = observer.lock();
    return *locked; // empty shared_ptr: dereferencing it is undefined
}
```

## Good

```cpp
#include <memory>

int main() {
    std::weak_ptr<int> observer;
    {
        auto owner = std::make_shared<int>(1);
        observer = owner;
    }
    if (std::shared_ptr<int> locked = observer.lock()) // null when expired
        return *locked;
    return 0;
}
```

## See Also

- [cpp-raii-weak-break-cycles](raii-weak-break-cycles.md) - why weak_ptr exists
- [cpp-ptr-enable-shared-from-this](ptr-enable-shared-from-this.md) - the other way to share an existing owner
