---
id: cpp-coll-vector-bool
lang: cpp
prefix: coll
title: Do not treat std::vector<bool> as an ordinary vector
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [vector-bool, proxy, bitset, specialization]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::vector]
related: [cpp-coll-vector-default, cpp-coll-invalidation]
sources:
  - title: cppreference - std::vector<bool>
    url: https://en.cppreference.com/w/cpp/container/vector_bool
  - title: cppreference - std::vector
    url: https://en.cppreference.com/w/cpp/container/vector
---
> The bool specialization packs bits, so references are proxies and storage is not contiguous.

## Why

`std::vector<bool>` is a space-efficient specialization: the reference states that it does not necessarily store its elements as a contiguous array, that `operator[]` returns a proxy object by value instead of a real reference, and that it does not meet all Container or SequenceContainer requirements — its iterators are implementation-defined and may not be forward iterators. Code that copies a proxy, binds it to `bool&`, or passes the buffer to a C API compiles differently or dangles. Where the bit packing is wanted, `std::bitset` offers it with a documented interface; otherwise use a container of a real type.

## Bad

```cpp
#include <vector>

int main() {
    std::vector<bool> flags{true, false};
    auto first = flags[0]; // copies the proxy, not a bool
    flags.push_back(true); // may reallocate the bit storage
    return first ? 0 : 1; // the proxy can dangle
}
```

## Good

```cpp
#include <vector>

int main() {
    std::vector<bool> flags{true, false};
    const bool first = flags[0]; // a real bool value
    flags.push_back(true);
    return first ? 0 : 1;
}
```

## See Also

- [cpp-coll-vector-default](coll-vector-default.md) - the ordinary vector
- [cpp-coll-invalidation](coll-invalidation.md) - reallocation invalidating references
