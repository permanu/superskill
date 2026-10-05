---
id: cpp-ptr-enable-shared-from-this
lang: cpp
prefix: ptr
title: Derive from enable_shared_from_this instead of making a second owner
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [shared-ptr, shared-from-this, ownership, control-block]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [shared_from_this]
related: [cpp-raii-weak-break-cycles, cpp-ptr-weak-lock]
sources:
  - title: cppreference - std::enable_shared_from_this
    url: https://en.cppreference.com/w/cpp/memory/enable_shared_from_this
  - title: cppreference - std::shared_ptr
    url: https://en.cppreference.com/w/cpp/memory/shared_ptr
---
> shared_ptr(this) creates a second control block; enable_shared_from_this shares the first.

## Why

The enable_shared_from_this reference describes the facility and names the hazard it replaces: it provides the safe alternative to an expression like `std::shared_ptr<T>(this)`, which is likely to result in `this` being destroyed more than once by multiple owners that are unaware of each other. A shared_ptr built from the raw this pointer gets its own control block and its own delete; shared_from_this() returns a pointer that shares the existing ownership. Calling it without an existing owner throws std::bad_weak_ptr.

## Bad

```cpp
#include <memory>

struct Widget {
    std::shared_ptr<Widget> share() {
        return std::shared_ptr<Widget>(this); // a second, unaware owner
    }
};

int main() {
    auto owner = std::make_shared<Widget>();
    auto second = owner->share(); // two owners, one object: double delete
    return 0;
}
```

## Good

```cpp
#include <memory>

struct Widget : std::enable_shared_from_this<Widget> {
    std::shared_ptr<Widget> share() {
        return shared_from_this(); // shares the existing ownership
    }
};

int main() {
    auto owner = std::make_shared<Widget>();
    auto second = owner->share(); // same control block
    return second.use_count() == 2 ? 0 : 1;
}
```

## See Also

- [cpp-raii-weak-break-cycles](raii-weak-break-cycles.md) - the other control-block discipline
- [cpp-ptr-weak-lock](ptr-weak-lock.md) - observing without owning
