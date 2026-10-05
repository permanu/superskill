---
id: cpp-unsafe-memcpy-overlap
lang: cpp
prefix: unsafe
title: Use memmove when source and destination overlap
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [memcpy, memmove, overlap, buffers]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [memcpy, memmove]
related: [cpp-coll-no-memset-nontrivial, cpp-ffi-trivial-copyable]
sources:
  - title: cppreference - std::memcpy
    url: https://en.cppreference.com/w/cpp/string/byte/memcpy
  - title: cppreference - Undefined behavior
    url: https://en.cppreference.com/w/cpp/language/ub
---
> memcpy's contract requires non-overlapping objects; an overlapping copy is undefined.

## Why

The memcpy reference states the contract directly: the behavior is undefined if dest or src is a null or invalid pointer, and if the copy takes place between objects that overlap. memmove exists precisely for the overlapping case. The UB reference counts memory misuse among the classes of behavior that make a program meaningless. Pick the function whose contract matches the ranges at hand.

## Bad

```cpp
#include <cstring>

int main() {
    char buffer[8] = "abcdefg";
    std::memcpy(buffer + 1, buffer, 4); // overlapping: undefined
    return buffer[1] == 'a' ? 0 : 1;
}
```

## Good

```cpp
#include <cstring>

int main() {
    char buffer[8] = "abcdefg";
    std::memmove(buffer + 1, buffer, 4); // overlap is handled
    return buffer[1] == 'a' ? 0 : 1;
}
```

## See Also

- [cpp-coll-no-memset-nontrivial](coll-no-memset-nontrivial.md) - the other byte-function hazard
- [cpp-ffi-trivial-copyable](ffi-trivial-copyable.md) - when byte copies preserve value
