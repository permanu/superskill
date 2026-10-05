---
id: cpp-ptr-shared-aliased-dangling
lang: cpp
prefix: ptr
title: Keep the owner alive while using an aliased pointer or reference
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [shared-ptr, temporary, dangling, aliasing]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-ptr-aliasing-ctor, cpp-const-ref-lifetime]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::shared_ptr
    url: https://en.cppreference.com/w/cpp/memory/shared_ptr
---
> A reference from a temporary shared_ptr outlives the object when the temporary dies.

## Why

R.37 asks not to pass a pointer or reference obtained from an aliased smart pointer, and the shared_ptr reference explains the lifetime: the object is destroyed when the last remaining shared_ptr owning it is destroyed. In an expression like `make()->value`, the shared_ptr returned by make() is the only owner and dies at the end of the full expression, taking the Widget with it — the reference is left naming storage that no longer holds an object. Bind the owner to a named variable first.

## Bad

```cpp
#include <memory>

struct Widget { int value = 1; };

std::shared_ptr<Widget> make() { return std::make_shared<Widget>(); }

int main() {
    const int& value = make()->value; // the temporary owner dies
    return value; // dangling reference
}
```

## Good

```cpp
#include <memory>

struct Widget { int value = 1; };

std::shared_ptr<Widget> make() { return std::make_shared<Widget>(); }

int main() {
    const std::shared_ptr<Widget> owner = make(); // keep the owner alive
    const int& value = owner->value;
    return value;
}
```

## See Also

- [cpp-ptr-aliasing-ctor](ptr-aliasing-ctor.md) - sharing ownership of a subobject
- [cpp-const-ref-lifetime](const-ref-lifetime.md) - the general temporary-lifetime rule
