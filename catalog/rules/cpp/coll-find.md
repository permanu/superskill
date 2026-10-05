---
id: cpp-coll-find
lang: cpp
prefix: coll
title: Use std::find and friends instead of hand-rolled search loops
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [find, algorithms, search, loop]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::find]
related: [cpp-coll-range-for, cpp-coll-lower-bound]
sources:
  - title: cppreference - Algorithms library
    url: https://en.cppreference.com/w/cpp/algorithm
  - title: cppreference - std::vector
    url: https://en.cppreference.com/w/cpp/container/vector
---
> The algorithm returns the position; a hand loop returns a bool you have to keep.

## Why

The algorithms library provides `find`, `find_if`, `count`, `count_if`, `all_of`, `any_of`, and `none_of` for exactly the questions loops are written to answer. A hand-rolled search re-derives one of them — usually with a flag that never breaks and a scan that cannot be reused — while the named algorithm states the intent and returns the position, which is strictly more information than the boolean. Where the loop also does something else, that part belongs in the loop body with the search replaced.

## Bad

```cpp
#include <vector>

int main() {
    const std::vector<int> values{3, 1, 4, 1, 5};
    bool found = false;
    for (int value : values)
        if (value == 4)
            found = true; // hand-rolled search with a flag
    return found ? 0 : 1;
}
```

## Good

```cpp
#include <algorithm>
#include <vector>

int main() {
    const std::vector<int> values{3, 1, 4, 1, 5};
    const auto match = std::find(values.begin(), values.end(), 4);
    return match != values.end() ? 0 : 1; // the algorithm states the search
}
```

## See Also

- [cpp-coll-range-for](coll-range-for.md) - the loop form for the other cases
- [cpp-coll-lower-bound](coll-lower-bound.md) - the logarithmic search for sorted data
