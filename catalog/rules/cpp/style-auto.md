---
id: cpp-style-auto
lang: cpp
prefix: style
title: Use auto to avoid repeating type names
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [auto, deduction, readability]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [auto]
related: [cpp-style-one-declaration, cpp-tmpl-ctad]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Placeholder type specifiers
    url: https://en.cppreference.com/w/cpp/language/auto
---
> The initializer already names the type; auto stops saying it twice.

## Why

ES.11 asks to use auto to avoid redundant repetition of type names. The cppreference auto page defines the mechanism: the type of a variable declared with `auto` is deduced from its initializer, using the rules for template argument deduction, and the examples show `auto a = 1 + 2` deducing int. Writing the type out again is a second declaration of the same fact that can drift when the initializer changes; auto keeps one source of truth. The same rule argues against auto where the type is the point — use it to remove repetition, not information.

## Bad

```cpp
#include <map>
#include <string>

int main() {
    std::map<std::string, int> counts{{"a", 1}};
    std::map<std::string, int>::iterator it = counts.begin(); // the type, repeated
    return it->second == 1 ? 0 : 1;
}
```

## Good

```cpp
#include <map>
#include <string>

int main() {
    std::map<std::string, int> counts{{"a", 1}};
    auto it = counts.begin(); // deduced from the initializer
    return it->second == 1 ? 0 : 1;
}
```

## See Also

- [cpp-style-one-declaration](style-one-declaration.md) - one name per declaration
- [cpp-tmpl-ctad](tmpl-ctad.md) - the same deduction for class templates
