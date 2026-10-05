---
id: cpp-proj-namespace-structure
lang: cpp
prefix: proj
title: Express logical structure with namespaces
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [namespace, structure, organization]
  files: ["**/*.hpp", "**/*.h", "**/*.cpp"]
  symbols: []
related: [cpp-proj-no-using-in-header, cpp-proj-unnamed-namespace]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Namespaces
    url: https://en.cppreference.com/w/cpp/language/namespace
---
> Namespaces put a module's names in their own scope and keep the global namespace small.

## Why

SF.20 asks to use namespaces to express logical structure. The namespace reference states the purpose: namespaces prevent name conflicts in large projects by placing entities in a namespace scope so they cannot be mistaken for identically named entities in other scopes. A library whose functions all sit in the global namespace competes with every other library and with the user's own names; grouping them under one namespace makes the structure visible at each call and leaves the global namespace for the few names that truly belong there.

## Bad

```cpp
int codec_encode(int value) { return value + 1; } // flat global scope
int codec_decode(int value) { return value - 1; }

int main() {
    return codec_encode(1) == 2 ? 0 : 1;
}
```

## Good

```cpp
namespace codec {
int encode(int value) { return value + 1; }
int decode(int value) { return value - 1; }
} // namespace codec

int main() {
    return codec::encode(1) == 2 ? 0 : 1;
}
```

## See Also

- [cpp-proj-no-using-in-header](proj-no-using-in-header.md) - not undoing the structure with directives
- [cpp-proj-unnamed-namespace](proj-unnamed-namespace.md) - the namespace for helpers that stay internal
