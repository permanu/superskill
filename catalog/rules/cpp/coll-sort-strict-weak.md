---
id: cpp-coll-sort-strict-weak
lang: cpp
prefix: coll
title: Sort with a strict ordering, never a less-or-equal comparator
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sort, comparator, ordering, undefined]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::sort]
related: [cpp-coll-lower-bound, cpp-coll-find]
sources:
  - title: cppreference - std::sort
    url: https://en.cppreference.com/w/cpp/algorithm/sort
  - title: cppreference - Algorithms library
    url: https://en.cppreference.com/w/cpp/algorithm
---
> The comparator must answer "is a ordered before b"; true for equals is not an answer.

## Why

`std::sort` takes a comparison function object that satisfies the requirements of Compare and returns `true` if the first argument is less than — ordered before — the second. A comparator using `<=` is true for equal elements, so the range it describes is not sorted under the library's definition, and the algorithms page states the behavior is undefined when the sorting requirement is not met. The `<=` slip is easy because the comparator looks like the condition of an insertion sort; the algorithm needs the strict form.

## Bad

```cpp
#include <algorithm>
#include <vector>

int main() {
    std::vector<int> values{3, 1, 2};
    std::sort(values.begin(), values.end(),
              [](int a, int b) { return a <= b; }); // true for equals
    return values[0] == 1 ? 0 : 1;
}
```

## Good

```cpp
#include <algorithm>
#include <vector>

int main() {
    std::vector<int> values{3, 1, 2};
    std::sort(values.begin(), values.end(),
              [](int a, int b) { return a < b; }); // strict: false for equals
    return values[0] == 1 ? 0 : 1;
}
```

## See Also

- [cpp-coll-lower-bound](coll-lower-bound.md) - the search that consumes sorted ranges
- [cpp-coll-find](coll-find.md) - the linear counterpart
