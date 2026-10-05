---
id: cpp-ptr-aliasing-ctor
lang: cpp
prefix: ptr
title: Point at a subobject with the aliasing constructor
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [aliasing-constructor, shared-ptr, subobject, control-block]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-raii-unique-default, cpp-ptr-shared-aliased-dangling]
sources:
  - title: cppreference - std::shared_ptr
    url: https://en.cppreference.com/w/cpp/memory/shared_ptr
  - title: cppreference - std::enable_shared_from_this
    url: https://en.cppreference.com/w/cpp/memory/enable_shared_from_this
---
> The aliasing constructor stores a subobject pointer while sharing the owner's control block.

## Why

The shared_ptr reference describes the feature: a shared_ptr can share ownership of an object while storing a pointer to another object, which can be used to point to member objects while owning the object they belong to — the stored pointer is what get() and dereference use, the managed pointer is what the deleter receives. Its Notes add the hazard: constructing a new shared_ptr from a raw pointer that another shared_ptr already owns leads to undefined behavior. The two-argument constructor binds the subobject to the existing control block instead.

## Bad

```cpp
#include <memory>

struct Widget { int value = 1; };

int main() {
    auto owner = std::make_shared<Widget>();
    std::shared_ptr<int> alias(&owner->value); // new control block for a member
    return *alias;
}
```

## Good

```cpp
#include <memory>

struct Widget { int value = 1; };

int main() {
    auto owner = std::make_shared<Widget>();
    std::shared_ptr<int> alias(owner, &owner->value); // shares owner's control block
    return *alias;
}
```

## See Also

- [cpp-raii-unique-default](raii-unique-default.md) - choosing the ownership model first
- [cpp-ptr-shared-aliased-dangling](ptr-shared-aliased-dangling.md) - the lifetime trap around aliases
