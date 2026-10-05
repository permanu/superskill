---
id: cpp-style-no-type-in-name
lang: cpp
prefix: style
title: Do not encode types in names
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, hungarian-notation, types]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-style-consistent-naming, cpp-type-strong-types]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Identifiers
    url: https://en.cppreference.com/w/cpp/language/identifiers
---
> The declaration states the type; a prefix repeats it and goes stale.

## Why

NL.5 asks to avoid encoding type information in names. The identifiers reference shows where the type actually lives: an identifier names an entity, and the type of an identifier expression is the type of the entity it names — one authority, checked by the compiler. A name like `iCount` adds a second, unchecked copy of the same fact: it can be wrong from the start and goes stale the moment the type changes, while the name keeps claiming otherwise. The name should say what the value means, not what it is made of.

## Bad

```cpp
int iCount = 0;      // the type is in the name
double dRatio = 1.0; // and again

int main() {
    return iCount == 0 && dRatio == 1.0 ? 0 : 1;
}
```

## Good

```cpp
int count = 0; // the declaration states the type
double ratio = 1.0;

int main() {
    return count == 0 && ratio == 1.0 ? 0 : 1;
}
```

## See Also

- [cpp-style-consistent-naming](style-consistent-naming.md) - one convention for all names
- [cpp-type-strong-types](type-strong-types.md) - putting meaning into types instead
