---
id: cpp-anti-using-directive
lang: cpp
prefix: anti
title: Keep using-directives out of file scope
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [using-namespace, name-lookup, pollution]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-proj-no-using-in-header, cpp-anti-shadowing]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Namespaces
    url: https://en.cppreference.com/w/cpp/language/namespace
---
> A using-directive makes every name of the namespace visible from that line onward.

## Why

SF.6 limits using-directives to transitions, foundation libraries, or a local scope, and SF.7 forbids them at global scope in headers. The namespace reference explains the effect: from the point of the directive onward, every name from the named namespace is visible as if declared in the nearest enclosing namespace. At file scope that is every line below it, so unrelated names join every lookup and a later declaration can change what an earlier-looking line means; using-declarations and qualified names keep the visible set explicit.

## Bad

```cpp
#include <algorithm>
#include <vector>

using namespace std; // every std name is now visible in this file

int main() {
    vector<int> values{1, 2};
    return count(values.begin(), values.end(), 2) == 1 ? 0 : 1;
}
```

## Good

```cpp
#include <algorithm>
#include <vector>

int main() {
    std::vector<int> values{1, 2};
    return std::count(values.begin(), values.end(), 2) == 1 ? 0 : 1;
}
```

## See Also

- [cpp-proj-no-using-in-header](proj-no-using-in-header.md) - the header version of the rule
- [cpp-anti-shadowing](anti-shadowing.md) - the lookup surprises it creates
