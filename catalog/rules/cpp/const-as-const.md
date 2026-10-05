---
id: cpp-const-as-const
lang: cpp
prefix: const
title: Force a read-only view with std::as_const instead of casting
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [as_const, const, overload, utility]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::as_const]
related: [cpp-const-no-cast-away, cpp-const-ref-params]
sources:
  - title: cppreference - std::as_const
    url: https://en.cppreference.com/w/cpp/utility/as_const
  - title: cppreference - const_cast conversion
    url: https://en.cppreference.com/w/cpp/language/const_cast
---
> as_const adds constness to an lvalue; the const rvalue overload is deleted.

## Why

`std::as_const` forms an lvalue reference to the const type of its argument, and its const rvalue overload is deleted to reject temporaries. That makes it the cast-free way to select a const overload of an overloaded function, hold a read-only view of a mutable local, or hand a range to generic code that must not modify it. `const_cast` in the other direction removes constness, which the cv reference notes is needed only to reach a less-qualified type — the wrong tool for this job and the wrong signal to the reader.

## Bad

```cpp
#include <string>

struct Buffer {
    const char* data() { return "mutable"; }
    const char* data() const { return "const"; }
};

int main() {
    Buffer buffer;
    return std::string(buffer.data()) == "const" ? 0 : 1; // picks the non-const overload
}
```

## Good

```cpp
#include <string>
#include <utility>

struct Buffer {
    const char* data() { return "mutable"; }
    const char* data() const { return "const"; }
};

int main() {
    Buffer buffer;
    return std::string(std::as_const(buffer).data()) == "const" ? 0 : 1; // const overload
}
```

## See Also

- [cpp-const-no-cast-away](const-no-cast-away.md) - the cast this replaces
- [cpp-const-ref-params](const-ref-params.md) - where read-only views belong
