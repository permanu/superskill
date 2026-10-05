---
id: cpp-pat-no-protected-data
lang: cpp
prefix: pat
title: Do not expose protected data
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [protected, inheritance, invariants]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-pat-same-access, cpp-type-class-invariant]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Access specifiers
    url: https://en.cppreference.com/w/cpp/language/access
---
> Protected data lets every derived class bypass the base's invariants.

## Why

C.133 asks to avoid protected data. The access reference describes what protected means: protected members form the interface of a class to its derived classes. Exposing data that way gives every current and future derived class direct write access to the state the base is supposed to maintain, so no base invariant can be relied on and every change to the representation breaks unknown subclasses. Protected operations keep the extension point without handing over the state.

## Bad

```cpp
struct Base {
protected:
    int state = 0; // derived classes reach into the data
};

struct Derived : Base {
    void bump() { ++state; }
};

int main() {
    Derived derived;
    derived.bump();
    return 0;
}
```

## Good

```cpp
class Base {
public:
    void bump() { ++state_; } // the base owns its invariants
    int state() const { return state_; }
protected:
    void reset() { state_ = 0; } // a protected operation, not the data
private:
    int state_ = 0;
};

struct Derived : Base {
    void double_bump() { bump(); bump(); }
};

int main() {
    Derived derived;
    derived.double_bump();
    return derived.state() == 2 ? 0 : 1;
}
```

## See Also

- [cpp-pat-same-access](pat-same-access.md) - access levels inside one class
- [cpp-type-class-invariant](type-class-invariant.md) - private data behind an invariant
