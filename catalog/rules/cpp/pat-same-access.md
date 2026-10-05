---
id: cpp-pat-same-access
lang: cpp
prefix: pat
title: Keep data members at one access level
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [access-specifiers, data-members, layout]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-pat-no-protected-data, cpp-type-class-invariant]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Access specifiers
    url: https://en.cppreference.com/w/cpp/language/access
---
> Mixed access on data makes the interface and the layout ambiguous.

## Why

C.134 asks that all non-const data members have the same access level. The access reference gives one concrete consequence: for standard-layout types all non-static data members must have the same access, and until C++23 the order of member addresses was only guaranteed within the same access — so mixing access specifiers can change the layout as well as the interface. The design point is the same: if some data is public and some is not, a reader cannot tell whether the public part is the interface or an accident.

## Bad

```cpp
struct Widget {
    int id;        // public
private:
    int flags = 0; // private: mixed access levels
};

int main() {
    Widget widget;
    widget.id = 1;
    return widget.id == 1 ? 0 : 1;
}
```

## Good

```cpp
class Widget {
public:
    void set_id(int value) { id_ = value; }
    int id() const { return id_; }
private:
    int id_ = 0;    // all data has the same access level
    int flags_ = 0;
};

int main() {
    Widget widget;
    widget.set_id(1);
    return widget.id() == 1 ? 0 : 1;
}
```

## See Also

- [cpp-pat-no-protected-data](pat-no-protected-data.md) - the protected-data case
- [cpp-type-class-invariant](type-class-invariant.md) - private data when an invariant exists
