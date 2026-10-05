---
id: cpp-coll-erase-remove
lang: cpp
prefix: coll
title: Remove elements with the erase-remove idiom, not a per-element erase loop
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [erase, remove, idiom, algorithm]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::remove, std::erase]
related: [cpp-coll-transform, cpp-coll-invalidation]
sources:
  - title: cppreference - std::remove, std::remove_if
    url: https://en.cppreference.com/w/cpp/algorithm/remove
  - title: cppreference - std::vector
    url: https://en.cppreference.com/w/cpp/container/vector
---
> One partition pass plus one trim replaces a shift per removed element.

## Why

The remove reference describes the idiom: a call to `remove` or `remove_if` is typically followed by the container's `erase` to actually shrink it, and the two together are the erase-remove idiom. `remove` shifts the kept elements to the front in a single pass and returns the new logical end; `erase` then trims once. Calling `erase` per matching element instead shifts the tail on every hit, turning a linear cleanup into quadratic work, and the iterator bookkeeping around it is easy to get wrong.

## Bad

```cpp
#include <cstddef>
#include <vector>

int main() {
    std::vector<int> values{1, 2, 3, 2, 1};
    for (std::size_t i = 0; i < values.size();) {
        if (values[i] == 2)
            values.erase(values.begin() + static_cast<std::ptrdiff_t>(i)); // shift per hit
        else
            ++i;
    }
    return values.size() == 3 ? 0 : 1;
}
```

## Good

```cpp
#include <algorithm>
#include <vector>

int main() {
    std::vector<int> values{1, 2, 3, 2, 1};
    values.erase(std::remove(values.begin(), values.end(), 2), values.end()); // one pass, one trim
    return values.size() == 3 ? 0 : 1;
}
```

## See Also

- [cpp-coll-transform](coll-transform.md) - the other single-pass algorithm
- [cpp-coll-invalidation](coll-invalidation.md) - what erase does to iterators
