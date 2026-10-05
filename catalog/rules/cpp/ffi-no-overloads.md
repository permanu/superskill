---
id: cpp-ffi-no-overloads
lang: cpp
prefix: ffi
title: Export one distinct C function per operation, never overloads
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [overload, c-api, mangling, names]
  files: ["**/*.hpp", "**/*.h", "**/*.cpp"]
  symbols: []
related: [cpp-ffi-extern-c, cpp-ffi-templates-not-c]
sources:
  - title: cppreference - Language linkage
    url: https://en.cppreference.com/w/cpp/language/language_linkage
  - title: cppreference - Replacing text macros
    url: https://en.cppreference.com/w/cpp/preprocessor/replace
---
> C has one symbol per name; overloads are a C++ mangling feature.

## Why

Language linkage encapsulates the name mangling algorithm — the mechanism that lets several C++ functions share one source name — and C has no such mechanism, so the C side can only call a name it can spell, once. Two C++ overloads of `widget_open` are distinct mangled symbols that no C declaration can select between. The interface for C therefore uses one distinct, C-linkage name per operation, with the variants expressed in the name (`widget_open_flags`) or as separate calls.

## Bad

```cpp
// The C side can call one symbol per name; these overloads mangle apart.
int widget_open(const char* name);
int widget_open(const char* name, int flags);

int main() {
    return 0;
}
```

## Good

```cpp
extern "C" int widget_open(const char* name);                  // one C symbol
extern "C" int widget_open_flags(const char* name, int flags); // distinct name

int main() {
    return 0;
}
```

## See Also

- [cpp-ffi-extern-c](ffi-extern-c.md) - the linkage that makes the names callable
- [cpp-ffi-templates-not-c](ffi-templates-not-c.md) - the other C++ feature C cannot select
