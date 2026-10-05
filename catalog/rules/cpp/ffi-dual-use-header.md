---
id: cpp-ffi-dual-use-header
lang: cpp
prefix: ffi
title: Hide extern "C" behind __cplusplus in headers shared with C
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cplusplus, header, shared, extern-c]
  files: ["**/*.h"]
  symbols: []
related: [cpp-ffi-extern-c, cpp-proj-self-contained-header]
sources:
  - title: cppreference - Language linkage
    url: https://en.cppreference.com/w/cpp/language/language_linkage
  - title: cppreference - Replacing text macros
    url: https://en.cppreference.com/w/cpp/preprocessor/replace
---
> The C compiler never sees the extern "C"; the C++ compiler always does.

## Why

The language-linkage reference gives the exact pattern and the reason: `extern "C"` makes it possible to include C declarations in a C++ program, but if the header is shared with a C program, `extern "C"` — which is not allowed in C — must be hidden with an appropriate `#ifdef`, typically `__cplusplus`. The preprocessor's predefined-macro table lists `__cplusplus` as the macro naming the language standard in use, so the guard is the portable switch between the two views of one header.

## Bad

```cpp
// widget.h shared with C
extern "C" int widget_init(void); // a C compiler rejects extern "C"

int main() {
    return 0;
}
```

## Good

```cpp
// widget.h shared with C
#ifdef __cplusplus
extern "C" {
#endif

int widget_init(void); // C sees the plain declaration

#ifdef __cplusplus
}
#endif

int main() {
    return 0;
}
```

## See Also

- [cpp-ffi-extern-c](ffi-extern-c.md) - what the guard is protecting
- [cpp-proj-self-contained-header](proj-self-contained-header.md) - headers that compile alone
