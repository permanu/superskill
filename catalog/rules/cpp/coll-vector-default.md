---
id: cpp-coll-vector-default
lang: cpp
prefix: coll
title: Use std::vector by default; pick another container only for its guarantees
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [vector, container, default, storage]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::vector]
related: [cpp-coll-array-over-carray, cpp-perf-contiguous-access]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::vector
    url: https://en.cppreference.com/w/cpp/container/vector
---
> Vector is contiguous and cheap to traverse; other containers earn their place.

## Why

SL.con.2 asks for `std::vector` by default unless there is a reason for a different container. A vector stores its elements contiguously, supports random access, and traverses linearly, so the common operations are the ones it does well; a node-based container trades locality and random access for guarantees — stable references, cheap splicing — that only matter when the design actually needs them. Choosing the container from the operations rather than habit keeps the default fast and the exceptions deliberate.

## Bad

```cpp
#include <list>

int main() {
    std::list<int> values{1, 2, 3}; // linked list for a simple traversal
    int sum = 0;
    for (int value : values)
        sum += value;
    return sum == 6 ? 0 : 1;
}
```

## Good

```cpp
#include <vector>

int main() {
    std::vector<int> values{1, 2, 3}; // contiguous by default
    int sum = 0;
    for (int value : values)
        sum += value;
    return sum == 6 ? 0 : 1;
}
```

## See Also

- [cpp-coll-array-over-carray](coll-array-over-carray.md) - the fixed-size sibling
- [cpp-perf-contiguous-access](perf-contiguous-access.md) - why contiguity pays
