---
id: cpp-proj-include-what-you-use
lang: cpp
prefix: proj
title: Do not rely on names pulled in by another header
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [includes, transitive, dependencies]
  files: ["**/*.hpp", "**/*.h", "**/*.cpp"]
  symbols: []
related: [cpp-proj-self-contained-header, cpp-proj-header-declares]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Source file inclusion
    url: https://en.cppreference.com/w/cpp/preprocessor/include
---
> Transitive includes are an implementation detail; include the header that declares the name.

## Why

SF.10 asks to avoid dependencies on implicitly included names. Because inclusion is textual replacement, a header's own includes become visible to everything that follows, and code that uses `std::vector` without including `<vector>` compiles only as long as some earlier header happens to pull it in. The dependency is invisible in the source and disappears with any unrelated include change. The rule is: every file includes the headers for the names it uses.

## Bad

```cpp
// widget.cpp
// widget.hpp (shown inline) includes <vector>:
#include <vector>

std::vector<int> collect(); // uses std::vector without including it directly

int main() {
    return 0;
}
```

## Good

```cpp
// widget.cpp
#include <vector> // used here: included here

int main() {
    return 0;
}
```

## See Also

- [cpp-proj-self-contained-header](proj-self-contained-header.md) - the header-side rule
- [cpp-proj-header-declares](proj-header-declares.md) - keeping interfaces and definitions apart
