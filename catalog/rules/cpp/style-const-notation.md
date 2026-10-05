---
id: cpp-style-const-notation
lang: cpp
prefix: style
title: Use conventional const notation
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [const, notation, style]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [const]
related: [cpp-const-ref-params, cpp-style-consistent-naming]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - cv type qualifiers
    url: https://en.cppreference.com/w/cpp/language/cv
---
> const T& and T const& mean the same; pick one and keep it.

## Why

NL.26 asks to use conventional const notation. The cv reference defines the qualifier and its position in the declaration sequence — const may appear before or after the type specifier with the same meaning — so the two spellings are equivalent to the compiler and different only to readers. Codebases that mix them make a text search for `const T` miss half the declarations; one convention keeps the qualifier where readers expect to find it.

## Bad

```cpp
int main() {
    int const value = 42; // east const
    return value == 42 ? 0 : 1;
}
```

## Good

```cpp
int main() {
    const int value = 42; // conventional west const
    return value == 42 ? 0 : 1;
}
```

## See Also

- [cpp-const-ref-params](const-ref-params.md) - const in parameter types
- [cpp-style-consistent-naming](style-consistent-naming.md) - the same idea for names
