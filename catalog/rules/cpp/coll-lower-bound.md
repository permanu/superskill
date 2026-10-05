---
id: cpp-coll-lower-bound
lang: cpp
prefix: coll
title: Search sorted data with lower_bound, not a linear scan
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [lower_bound, binary-search, sorted, complexity]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::lower_bound]
related: [cpp-coll-sort-strict-weak, cpp-coll-map-find]
sources:
  - title: cppreference - std::lower_bound
    url: https://en.cppreference.com/w/cpp/algorithm/lower_bound
  - title: cppreference - Algorithms library
    url: https://en.cppreference.com/w/cpp/algorithm
---
> Sorted ranges support logarithmic search; a scan ignores the order it paid for.

## Why

`std::lower_bound` finds the first element not ordered before the value with at most `log2(N)+O(1)` comparisons, and the algorithms page groups it with `upper_bound`, `equal_range`, and `binary_search` as the binary-search operations on partitioned ranges. A linear scan of the same range does N comparisons and discards the ordering invariant entirely. The result of `lower_bound` is a position, so equality is a second check against the value; for maps and sets, prefer the member functions, whose iterators are not random access.

## Bad

```cpp
#include <vector>

int main() {
    const std::vector<int> sorted{1, 3, 5, 7, 9};
    const int target = 7;
    bool found = false;
    for (int value : sorted)
        if (value == target)
            found = true; // linear scan of sorted data
    return found ? 0 : 1;
}
```

## Good

```cpp
#include <algorithm>
#include <vector>

int main() {
    const std::vector<int> sorted{1, 3, 5, 7, 9};
    const int target = 7;
    const auto position = std::lower_bound(sorted.begin(), sorted.end(), target);
    return (position != sorted.end() && *position == target) ? 0 : 1;
}
```

## See Also

- [cpp-coll-sort-strict-weak](coll-sort-strict-weak.md) - producing the ordering this needs
- [cpp-coll-map-find](coll-map-find.md) - the associative-container lookup
