---
id: cpp-ptr-addressof
lang: cpp
prefix: ptr
title: Take addresses with std::addressof in generic code
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [addressof, operator-ampersand, generic-code]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [addressof]
related: [cpp-type-span, cpp-raii-raw-non-owning]
sources:
  - title: cppreference - std::addressof
    url: https://en.cppreference.com/w/cpp/memory/addressof
---
> operator& can be overloaded; std::addressof returns the object's actual address.

## Why

The addressof reference says it obtains the actual address of the object or function argument, even in the presence of an overloaded operator&, and its example shows the difference: a wrapper type with an overloaded operator& sends `&p` to a different overload than `std::addressof(p)`. Templates and generic code cannot assume that operator& means address-of, so they call std::addressof. The rvalue overload is deleted, so an address cannot be taken from a temporary by accident.

## Bad

```cpp
struct Widget {
    int value = 1;
    Widget* operator&() { return nullptr; } // a user-defined operator&
};

template <class T>
T* address_of(T& value) {
    return &value; // invokes the overload: null
}

int main() {
    Widget widget;
    return address_of(widget) == nullptr ? 1 : 0;
}
```

## Good

```cpp
#include <memory>

struct Widget {
    int value = 1;
    Widget* operator&() { return nullptr; } // a user-defined operator&
};

template <class T>
T* address_of(T& value) {
    return std::addressof(value); // the object's actual address
}

int main() {
    Widget widget;
    return address_of(widget) == nullptr ? 1 : 0;
}
```

## See Also

- [cpp-type-span](type-span.md) - generic interfaces over sequences
- [cpp-raii-raw-non-owning](raii-raw-non-owning.md) - what the address is allowed to mean
