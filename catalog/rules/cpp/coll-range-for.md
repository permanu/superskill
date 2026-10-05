---
id: cpp-coll-range-for
lang: cpp
prefix: coll
title: Traverse containers with range-for instead of index bookkeeping
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [range-for, iteration, index, loop]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-perf-range-for-refs, cpp-coll-find]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::vector
    url: https://en.cppreference.com/w/cpp/container/vector
---
> The range-for names the traversal; the index form adds a counter to get wrong.

## Why

ES.71 prefers a range-`for` over a `for` when there is a choice. The range form states "for each element" directly and leaves the index type, the bound expression, and the increment to the compiler, so the loop cannot run past the end or skip an element. The index form exists for the cases that need the position itself; where it does not, it is three extra pieces of state per loop.

## Bad

```cpp
#include <vector>

int main() {
    const std::vector<int> values{1, 2, 3};
    int sum = 0;
    for (std::size_t i = 0; i < values.size(); ++i) // index bookkeeping
        sum += values[i];
    return sum == 6 ? 0 : 1;
}
```

## Good

```cpp
#include <vector>

int main() {
    const std::vector<int> values{1, 2, 3};
    int sum = 0;
    for (int value : values) // no index bookkeeping
        sum += value;
    return sum == 6 ? 0 : 1;
}
```

## See Also

- [cpp-perf-range-for-refs](perf-range-for-refs.md) - taking elements by reference
- [cpp-coll-find](coll-find.md) - letting an algorithm state the search instead
