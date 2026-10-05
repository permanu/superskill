---
id: cpp-const-no-cast-away
lang: cpp
prefix: const
title: Never cast away const to write through the result
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [const_cast, undefined, const, mutation]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [const_cast]
related: [cpp-const-immutable-by-default, cpp-const-no-cast-this]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - const_cast conversion
    url: https://en.cppreference.com/w/cpp/language/const_cast
---
> If the object is const, writing through a cast is undefined behavior.

## Why

ES.50 is direct: don't cast away const. The `const_cast` reference explains what the cast can and cannot do — it forms a non-const access path, and modifying a const object through such a path results in undefined behavior, as does referring to a volatile object through a non-volatile glvalue. The cast is legal where the underlying object was never const (the reference's own example modifies a non-const `int` through a const reference); as a way to "make it writable", it is a promise the compiler is entitled to disbelieve.

## Bad

```cpp
#include <cstddef>

int main() {
    const std::size_t limit = 10;
    auto* writable = const_cast<std::size_t*>(&limit);
    *writable = 20; // undefined behavior: limit is a const object
    return limit == 20 ? 0 : 1;
}
```

## Good

```cpp
#include <cstddef>

int main() {
    std::size_t limit = 10; // non-const: mutation is legal
    limit = 20;
    return limit == 20 ? 0 : 1;
}
```

## See Also

- [cpp-const-immutable-by-default](const-immutable-by-default.md) - deciding constness at the declaration
- [cpp-const-no-cast-this](const-no-cast-this.md) - the same cast hiding in member functions
