---
id: cpp-ffi-extern-c
lang: cpp
prefix: ffi
title: Declare C functions with extern "C" so their names are not mangled
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [extern-c, linkage, mangling, c-api]
  files: ["**/*.hpp", "**/*.h", "**/*.cpp"]
  symbols: [extern]
related: [cpp-ffi-dual-use-header, cpp-ffi-prefer-cpp]
sources:
  - title: cppreference - Language linkage
    url: https://en.cppreference.com/w/cpp/language/language_linkage
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> C++ mangles names; extern "C" turns that off for the boundary.

## Why

The language-linkage reference states that every function name with external linkage has a language linkage encapsulating the requirements to link with another language — the calling convention and the name mangling algorithm — and that `"C"` linkage "makes it possible to link with functions written in the C programming language, and to define, in a C++ program, functions that can be called from the units written in C". Without it, a C++ compiler emits a mangled symbol and the C library's `open` is not the symbol the linker looks for. CPL.3 adds the calling side: keep C for the interface and use C++ around it.

## Bad

```cpp
int c_open(const char* path, int flags); // C++ linkage: the name is mangled

int main() {
    return 0;
}
```

## Good

```cpp
extern "C" int c_open(const char* path, int flags); // C linkage: unmangled name

int main() {
    return 0;
}
```

## See Also

- [cpp-ffi-dual-use-header](ffi-dual-use-header.md) - headers that both languages include
- [cpp-ffi-prefer-cpp](ffi-prefer-cpp.md) - keeping the C surface as small as possible
