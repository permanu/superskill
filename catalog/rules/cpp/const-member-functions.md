---
id: cpp-const-member-functions
lang: cpp
prefix: const
title: Mark member functions const when they do not modify the object
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [const, member-functions, methods]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [const]
related: [cpp-const-immutable-by-default, cpp-const-mutable]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - cv type qualifiers
    url: https://en.cppreference.com/w/cpp/language/cv
---
> A non-const member function cannot be called on a const object; a reader should be const.

## Why

Con.2 asks that member functions be const by default — const in the sense that they do not modify the object's observable state. The cv reference's model makes the consequence concrete: a const object cannot be modified, and only const member functions can be called on it, so a read-only accessor left non-const silently makes every const object and const reference of the class unusable for reading. Marking the accessor const is what lets the type participate in const-correct interfaces.

## Bad

```cpp
class Reading {
public:
    int value() { return value_; } // reads, but is not marked const
private:
    int value_ = 0;
};

int main() {
    Reading reading;
    return reading.value() == 0 ? 0 : 1; // works only on non-const objects
}
```

## Good

```cpp
class Reading {
public:
    int value() const { return value_; } // callable on const objects
private:
    int value_ = 0;
};

int main() {
    const Reading reading;
    return reading.value() == 0 ? 0 : 1;
}
```

## See Also

- [cpp-const-immutable-by-default](const-immutable-by-default.md) - the object-side default
- [cpp-const-mutable](const-mutable.md) - the controlled exception for caches and mutexes
