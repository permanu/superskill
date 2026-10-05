---
id: cpp-api-c-abi-subset
lang: cpp
prefix: api
title: Expose only a C-style subset across a cross-compiler ABI boundary
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [abi, extern, interface, shared-library]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [extern "C"]
related: [cpp-api-pimpl, cpp-err-no-throw-across-c]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> For a boundary between compilers or standard libraries, export C-compatible types and opaque handles.

## Why

C++ types such as `std::string`, `std::vector`, and exceptions have layouts and behaviors defined by the standard library implementation, not by the standard, so passing them across a boundary between different compilers or standard library versions is undefined. A C-style subset, pointers to opaque types plus plain functions with C linkage, has a stable, widely shared ABI and can be consumed from any language with a C FFI.

## Bad

```cpp
#include <string>
#include <vector>

// Bad: std::vector/std::string layout differs between standard libraries.
std::vector<std::string> split(const std::string& text);
```

## Good

```cpp
extern "C" {
struct Context; // opaque handle; layout stays private

Context* context_create(void);
int context_split(Context* context, const char* text);
void context_destroy(Context* context);
}
```

## See Also

- [cpp-api-pimpl](api-pimpl.md) - the C++-to-C++ version of hiding layout
- [cpp-err-no-throw-across-c](err-no-throw-across-c.md) - exceptions must not cross this boundary
