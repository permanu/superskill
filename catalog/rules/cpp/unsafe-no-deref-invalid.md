---
id: cpp-unsafe-no-deref-invalid
lang: cpp
prefix: unsafe
title: Never dereference a null or invalid pointer
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [null-dereference, invalid-pointer, undefined-behavior]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [nullptr]
related: [cpp-unsafe-return-local-address, cpp-const-ref-lifetime]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Undefined behavior
    url: https://en.cppreference.com/w/cpp/language/ub
---
> A pointer that is null, expired, or out of its object's lifetime has no pointee to read.

## Why

ES.65 is "Don't dereference an invalid pointer". The UB reference lists null pointer dereference among its examples and shows the optimizer consequence: for `int* p = nullptr; return *p;` the compiled function is just `ret` — once the dereference exists, the program is not required to do anything meaningful. Invalid covers null, freed storage, objects whose lifetime has ended, and one-past-the-end pointers; the requirement is that the pointer refers to a live object of the right type at the moment of the read.

## Bad

```cpp
int main() {
    int* value = nullptr;
    return *value; // dereferences null: undefined
}
```

## Good

```cpp
int main() {
    int storage = 0;
    int* value = &storage;
    return *value; // points to a live object
}
```

## See Also

- [cpp-unsafe-return-local-address](unsafe-return-local-address.md) - the most common way a pointer goes invalid
- [cpp-const-ref-lifetime](const-ref-lifetime.md) - the reference form of the same lifetime rule
