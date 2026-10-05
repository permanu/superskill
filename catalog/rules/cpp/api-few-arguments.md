---
id: cpp-api-few-arguments
lang: cpp
prefix: api
title: Keep argument lists short by grouping related values into a struct
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [arguments, parameters, grouping, options]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-api-adjacent-params, cpp-api-return-struct]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Group values that travel together into a struct so call sites stay readable and hard to misorder.

## Why

Long argument lists are unreadable at the call site and easy to misorder, especially when several parameters share a type. Values that describe one concept, such as a rectangle or a set of options, belong in an aggregate that can be named, defaulted, and extended without touching every call. The function then receives one object per concept instead of a positional sequence.

## Bad

```cpp
// Bad: seven positional arguments, several of them bools.
void render(int x, int y, int width, int height, int depth, bool wireframe, bool shaded);
```

## Good

```cpp
struct Rect {
    int x;
    int y;
    int width;
    int height;
};

struct RenderOptions {
    int depth = 1;
    bool wireframe = false;
    bool shaded = true;
};

void render(Rect area, RenderOptions options);
```

## See Also

- [cpp-api-adjacent-params](api-adjacent-params.md) - the same-type subset of this problem
- [cpp-api-return-struct](api-return-struct.md) - the return side of grouping values
