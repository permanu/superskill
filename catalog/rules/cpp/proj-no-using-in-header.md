---
id: cpp-proj-no-using-in-header
lang: cpp
prefix: proj
title: Never write using namespace at global scope in a header
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [using-namespace, headers, pollution]
  files: ["**/*.hpp", "**/*.h"]
  symbols: []
related: [cpp-proj-namespace-structure, cpp-proj-self-contained-header]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Namespaces
    url: https://en.cppreference.com/w/cpp/language/namespace
---
> A using-directive in a header leaks into every file that includes it.

## Why

SF.7 forbids `using namespace` at global scope in a header, and the namespace reference gives the mechanism: from the point of a using-directive onward, every name from the named namespace is visible as if declared in the nearest enclosing namespace. In a header that means the directive's effect follows every includer for the rest of its translation unit, so unrelated names become visible, ambiguities appear where none existed, and the header silently changes the meaning of code it does not own. The reference itself points to SF.7 from its notes.

## Bad

```cpp
// widget.hpp
#include <string>
using namespace std; // every includer now sees all of std

string widget_name(); // resolves only because of the directive

int main() {
    return widget_name().empty() ? 0 : 1;
}
```

## Good

```cpp
// widget.hpp
#include <string>

std::string widget_name(); // qualified: no pollution

int main() {
    return widget_name().empty() ? 0 : 1;
}
```

## See Also

- [cpp-proj-namespace-structure](proj-namespace-structure.md) - namespaces as structure
- [cpp-proj-self-contained-header](proj-self-contained-header.md) - the other header hygiene rule
