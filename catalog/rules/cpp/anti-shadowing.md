---
id: cpp-anti-shadowing
lang: cpp
prefix: anti
title: Do not reuse names in nested scopes
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [shadowing, scope, name-lookup]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-anti-using-directive, cpp-init-declare-at-use]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Scope
    url: https://en.cppreference.com/w/cpp/language/scope
---
> An inner declaration with the same name hides the outer one from its locus onward.

## Why

ES.12 asks not to reuse names in nested scopes. The scope reference describes how lookup resolves the name: unqualified name lookup associates a name with its declaration within the scope, and the locus rules make the inner declaration visible from the point it is declared — so from there to the end of the block, the outer variable is unreachable by name and any intended use of it silently reads or writes the inner one. Distinct names keep both objects addressable and the intent visible.

## Bad

```cpp
int main() {
    int value = 1;
    {
        int value = 2; // shadows the outer name
        (void)value;
    }
    return value == 1 ? 0 : 1;
}
```

## Good

```cpp
int main() {
    int value = 1;
    {
        int inner = 2; // distinct name
        (void)inner;
    }
    return value == 1 ? 0 : 1;
}
```

## See Also

- [cpp-anti-using-directive](anti-using-directive.md) - the other lookup surprise
- [cpp-init-declare-at-use](init-declare-at-use.md) - declaring where the scope is minimal
