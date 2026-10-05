---
id: cpp-pat-no-trivial-accessors
lang: cpp
prefix: pat
title: Do not wrap plain data in accessor pairs
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [getters, setters, encapsulation]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-pat-same-access, cpp-type-class-invariant]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Access specifiers
    url: https://en.cppreference.com/w/cpp/language/access
---
> A getter and setter that only forward add syntax, not safety.

## Why

C.131 asks to avoid trivial getters and setters. The access reference frames what the access specifiers are for: they let the author decide which members are the interface and which are for internal use. A pair that reads and writes one field without enforcing anything keeps the field public in effect while hiding it in syntax — callers write more code and learn nothing. Either the member is plain data and can be public, or the class has an invariant and the accessors should enforce it.

## Bad

```cpp
class Widget {
public:
    int get_id() const { return id_; } // nothing but the field
    void set_id(int value) { id_ = value; }
private:
    int id_ = 0;
};

int main() {
    Widget widget;
    widget.set_id(1);
    return widget.get_id() == 1 ? 0 : 1;
}
```

## Good

```cpp
struct Widget { // plain data: a public member, no accessor pair
    int id = 0;
};

int main() {
    Widget widget;
    widget.id = 1;
    return widget.id == 1 ? 0 : 1;
}
```

## See Also

- [cpp-pat-same-access](pat-same-access.md) - access levels for data members
- [cpp-type-class-invariant](type-class-invariant.md) - when accessors should enforce something
