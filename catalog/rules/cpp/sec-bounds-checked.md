---
id: cpp-sec-bounds-checked
lang: cpp
prefix: sec
title: Bounds-check untrusted indices before touching the container
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bounds, untrusted, index, out-of-range]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::vector, "operator[]"]
related: [cpp-sec-integer-overflow, cpp-type-span]
sources:
  - title: "CWE-125: Out-of-bounds Read"
    url: https://cwe.mitre.org/data/definitions/125.html
  - title: cppreference - std::vector
    url: https://en.cppreference.com/w/cpp/container/vector
---
> Use bounds-checked access for indices that come from outside the program.

## Why

An index derived from network input, a file, or a command line can be any value, and `operator[]` performs no check: reading or writing outside the container is undefined behavior that reads adjacent memory or corrupts it. CWE-125 records out-of-bounds reads as a core weakness class, commonly reachable exactly through unchecked indexing of attacker-controlled positions. The bounds-checked accessor throws instead, turning memory corruption into an ordinary failure the caller handles.

## Bad

```cpp
#include <vector>

int value_at(const std::vector<int>& values, int index) {
    return values[index]; // index from outside: unchecked
}

int main() {
    const std::vector<int> values{1, 2, 3};
    return value_at(values, 7);
}
```

## Good

```cpp
#include <stdexcept>
#include <vector>

int value_at(const std::vector<int>& values, int index) {
    return values.at(static_cast<std::size_t>(index)); // throws when out of range
}

int main() {
    const std::vector<int> values{1, 2, 3};
    try {
        return value_at(values, 7);
    } catch (const std::out_of_range&) {
        return 1;
    }
}
```

## See Also

- [cpp-sec-integer-overflow](sec-integer-overflow.md) - a wrapped index can bypass any check
- [cpp-type-span](type-span.md) - carrying the length with the data
