---
id: cpp-proj-unnamed-namespace
lang: cpp
prefix: proj
title: Keep internal helpers in an unnamed namespace
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unnamed-namespace, internal-linkage, helpers]
  files: ["**/*.cpp"]
  symbols: []
related: [cpp-proj-no-unnamed-header, cpp-proj-header-declares]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Namespaces
    url: https://en.cppreference.com/w/cpp/language/namespace
---
> Helpers that no other translation unit needs should not claim external names.

## Why

SF.22 asks to use an unnamed (anonymous) namespace for all internal and non-exported entities. The namespace reference states the effect: unnamed namespaces, and everything declared within them, have internal linkage, so the helper is invisible outside its translation unit and cannot collide with a same-named function elsewhere in the program. A helper with external linkage, by contrast, claims a name in the program's link namespace that every other translation unit must avoid.

## Bad

```cpp
// widget.cpp
int clamp_to_range(int value) { // external linkage: collides with other TUs
    return value < 0 ? 0 : value;
}

int main() {
    return clamp_to_range(-1) == 0 ? 0 : 1;
}
```

## Good

```cpp
// widget.cpp
namespace {
int clamp_to_range(int value) { // internal linkage: local to this TU
    return value < 0 ? 0 : value;
}
} // namespace

int main() {
    return clamp_to_range(-1) == 0 ? 0 : 1;
}
```

## See Also

- [cpp-proj-no-unnamed-header](proj-no-unnamed-header.md) - why this belongs in .cpp files only
- [cpp-proj-header-declares](proj-header-declares.md) - what should be exported instead
