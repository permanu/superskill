---
id: cpp-unsafe-placement-new
lang: cpp
prefix: unsafe
title: Reuse storage only after ending the old object's lifetime
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [placement-new, storage-reuse, lifetime, buffers]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [new]
related: [cpp-unsafe-use-after-lifetime, cpp-mem-buffer-vector-byte]
sources:
  - title: cppreference - Lifetime
    url: https://en.cppreference.com/w/cpp/language/lifetime
  - title: cppreference - new expression
    url: https://en.cppreference.com/w/cpp/language/new
---
> Constructing into occupied storage ends the old object; reading it afterward is undefined.

## Why

The lifetime reference's "Storage reuse" section gives the rule and the example: when a program ends an object's lifetime, it must ensure that a new object of the same type is constructed in place before the destructor may run implicitly, and it marks `new (&x) S(x.m);` — reusing x's storage while the new expression still reads x.m — as undefined behavior. Its "Providing storage" example shows the clean form: construct into fresh byte storage that provides room for the object.

## Bad

```cpp
#include <new>

struct S {
    int m;
};

int main() {
    S x{1};
    new (&x) S(x.m); // the storage is reused before the argument is read
    return 0;
}
```

## Good

```cpp
#include <new>

struct S {
    int m;
};

int main() {
    alignas(S) unsigned char storage[sizeof(S)];
    auto* value = new (storage) S{1}; // fresh storage provides the object
    return value->m == 1 ? 0 : 1;
}
```

## See Also

- [cpp-unsafe-use-after-lifetime](unsafe-use-after-lifetime.md) - the general lifetime rule
- [cpp-mem-buffer-vector-byte](mem-buffer-vector-byte.md) - byte buffers that can provide storage
