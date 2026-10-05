---
id: cpp-unsafe-invalid-downcast
lang: cpp
prefix: unsafe
title: Downcast only with a runtime check
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [downcast, dynamic-cast, static-cast, rtti]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [dynamic_cast, static_cast]
related: [cpp-unsafe-no-deref-invalid, cpp-api-virtual-dtor]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - dynamic_cast conversion
    url: https://en.cppreference.com/w/cpp/language/dynamic_cast
---
> A static downcast on the wrong object produces a reference that is undefined to use.

## Why

C.146 asks to use dynamic_cast where class hierarchy navigation is unavoidable. The dynamic_cast reference defines the checked behavior — a failed pointer cast yields the null pointer value, a failed reference cast throws std::bad_cast — and its Notes warn that the static_cast form is only safe if the program can guarantee through some other logic that the object really is the derived type. Without that guarantee the cast produces a glvalue for an object that is not there, and using it is undefined.

## Bad

```cpp
struct Base {
    virtual ~Base() = default;
};
struct Derived : Base {
    int value = 1;
};

int main() {
    Base base;
    auto& derived = static_cast<Derived&>(base); // base is not a Derived
    return derived.value;
}
```

## Good

```cpp
struct Base {
    virtual ~Base() = default;
};
struct Derived : Base {
    int value = 1;
};

int main() {
    Base base;
    if (auto* derived = dynamic_cast<Derived*>(&base)) // checked downcast
        return derived->value;
    return 0;
}
```

## See Also

- [cpp-unsafe-no-deref-invalid](unsafe-no-deref-invalid.md) - the access the bad cast enables
- [cpp-api-virtual-dtor](api-virtual-dtor.md) - the polymorphic base these casts need
