---
id: cpp-type-span
lang: cpp
prefix: type
title: Pass contiguous sequences as std::span instead of a pointer and a separate size
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [span, pointer, size, range, interface]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::span]
related: [cpp-type-string-view, cpp-type-strong-types]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::span
    url: https://en.cppreference.com/w/cpp/container/span
---
> Take sequences as std::span so length travels with the data and loops are range-checked.

## Why

A `(pointer, count)` interface splits one fact across two arguments: a typo can pass a count larger than the buffer, and the callee cannot recover the real size. `std::span` binds the pointer and length into one object constructed from arrays, vectors, or pointer-count pairs, so the size is always consistent with the data. Iterating the span makes out-of-range access impossible without an explicit index.

## Bad

```cpp
void fill(int* data, int count) {
    for (int i = 0; i < count; ++i)
        data[i] = 0;
}

int main() {
    int buffer[8];
    fill(buffer, 800); // typo: size and pointer can disagree
}
```

## Good

```cpp
#include <cstddef>
#include <span>

void fill(std::span<int> data) {
    for (int& value : data)
        value = 0;
}

int main() {
    int buffer[8];
    fill(buffer); // size carried in the type
}
```

## See Also

- [cpp-type-string-view](type-string-view.md) - the same idea for character sequences
- [cpp-type-strong-types](type-strong-types.md) - types that keep related arguments consistent
