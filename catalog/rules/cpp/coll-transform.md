---
id: cpp-coll-transform
lang: cpp
prefix: coll
title: Map elements with std::transform instead of a hand-rolled loop
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [transform, map, algorithm, destination]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::transform]
related: [cpp-coll-find, cpp-coll-range-for]
sources:
  - title: cppreference - std::transform
    url: https://en.cppreference.com/w/cpp/algorithm/transform
  - title: cppreference - Algorithms library
    url: https://en.cppreference.com/w/cpp/algorithm
---
> transform names the mapping and writes into a destination range in one pass.

## Why

`std::transform` applies the given function to each element of the source range and stores the result in the destination range, with exactly N applications for N elements. A hand-written mapping loop does the same work but mixes traversal, sizing, and the operation, and it usually grows the output one element at a time. The algorithm states which range is read, which is written, and what the mapping is; where the destination is the source, the in-place form is the same call.

## Bad

```cpp
#include <vector>

int main() {
    const std::vector<int> input{1, 2, 3};
    std::vector<int> output;
    for (int value : input)
        output.push_back(value * 2); // hand-rolled map
    return output[1] == 4 ? 0 : 1;
}
```

## Good

```cpp
#include <algorithm>
#include <vector>

int main() {
    const std::vector<int> input{1, 2, 3};
    std::vector<int> output(input.size());
    std::transform(input.begin(), input.end(), output.begin(),
                   [](int value) { return value * 2; }); // map in one call
    return output[1] == 4 ? 0 : 1;
}
```

## See Also

- [cpp-coll-find](coll-find.md) - the search counterpart
- [cpp-coll-range-for](coll-range-for.md) - the loop form for side effects
