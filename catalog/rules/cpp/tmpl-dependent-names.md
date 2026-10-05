---
id: cpp-tmpl-dependent-names
lang: cpp
prefix: tmpl
title: Disambiguate dependent names with typename and template
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dependent-names, typename, disambiguator]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [typename]
related: [cpp-tmpl-generic-algorithm, cpp-trait-declval]
sources:
  - title: cppreference - Dependent names
    url: https://en.cppreference.com/w/cpp/language/dependent_name
  - title: cppreference - Templates
    url: https://en.cppreference.com/w/cpp/language/templates
---
> A dependent name is not a type or template unless the keyword says so.

## Why

The dependent-names reference states the rule: in a template, a name that depends on a template parameter and is not a member of the current instantiation is not considered to be a type unless typename is used — without it, a declaration parses as an expression — and a dependent name is not considered to be a template name unless the disambiguation keyword template is used. Both keywords tell the parser what the name will be before the arguments are known; the alternative is a definition that parses as something else entirely.

## Bad

```cpp
#include <vector>

int p = 1;

template <class T>
void fill(const std::vector<T>& values) {
    std::vector<T>::const_iterator* p; // parsed as a multiplication
    (void)values;
}

int main() {
    return 0;
}
```

## Good

```cpp
#include <vector>

template <class T>
void fill(const std::vector<T>& values) {
    typename std::vector<T>::const_iterator it = values.begin(); // a type
    (void)it;
}

int main() {
    std::vector<int> values{1};
    fill(values);
    return 0;
}
```

## See Also

- [cpp-tmpl-generic-algorithm](tmpl-generic-algorithm.md) - the templates these names live in
- [cpp-trait-declval](trait-declval.md) - hypothetical values in the same contexts
