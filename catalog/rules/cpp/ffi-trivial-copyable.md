---
id: cpp-ffi-trivial-copyable
lang: cpp
prefix: ffi
title: Only trivially copyable types cross the boundary by value
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [trivially-copyable, memcpy, c-api, by-value]
  files: ["**/*.hpp", "**/*.h", "**/*.cpp"]
  symbols: []
related: [cpp-ffi-standard-layout, cpp-coll-no-memset-nontrivial]
sources:
  - title: cppreference - TriviallyCopyable
    url: https://en.cppreference.com/w/cpp/named_req/TriviallyCopyable
  - title: cppreference - StandardLayoutType
    url: https://en.cppreference.com/w/cpp/named_req/StandardLayoutType
---
> Byte-wise transport only preserves value for trivially copyable types.

## Why

The TriviallyCopyable reference states the guarantee: for a trivially copyable type, the underlying bytes of one object can be copied into another, and the destination holds the source's value; the bytes can be moved by `std::memcpy` or `std::memmove`. That guarantee is exactly what a foreign boundary offers — bytes in memory. A type with a `std::string` member is not trivially copyable: its bytes include a pointer to a buffer, and copying the pointer without the buffer leaves both sides referring to storage only one of them controls.

## Bad

```cpp
#include <string>

struct Config { // crosses a C boundary by value
    std::string name; // not trivially copyable
};

int main() {
    return 0;
}
```

## Good

```cpp
struct Config { // its bytes can be copied safely
    int retries;
    int timeout;
};

int main() {
    return 0;
}
```

## See Also

- [cpp-ffi-standard-layout](ffi-standard-layout.md) - the layout half of the same requirement
- [cpp-coll-no-memset-nontrivial](coll-no-memset-nontrivial.md) - the same byte hazard inside C++
