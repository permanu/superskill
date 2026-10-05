---
id: cpp-coll-invalidation
lang: cpp
prefix: coll
title: Do not hold iterators or pointers across container modifications
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [invalidation, reallocation, iterators, push_back]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::vector]
related: [cpp-coll-vector-bool, cpp-coll-erase-remove]
sources:
  - title: cppreference - std::vector
    url: https://en.cppreference.com/w/cpp/container/vector
  - title: cppreference - std::string
    url: https://en.cppreference.com/w/cpp/string/basic_string
---
> An insertion that reallocates replaces the buffer; every pointer into the old one dies.

## Why

The vector reference documents its iterator invalidation rules: an insertion whose new size exceeds the current capacity reallocates, and all iterators and references into the elements are invalidated; even without reallocation, insertions and erasures invalidate everything from the operation point onward. A pointer taken before the modification — `&values[0]` is the common one — still points into the freed buffer afterward. The safe order is to finish the structural changes, then take the pointer.

## Bad

```cpp
#include <vector>

int main() {
    std::vector<int> values{1, 2, 3};
    const int* first = &values[0];
    values.push_back(4); // may reallocate and move the elements
    return *first == 1 ? 0 : 1; // first may dangle
}
```

## Good

```cpp
#include <vector>

int main() {
    std::vector<int> values{1, 2, 3};
    values.push_back(4); // finish the modifications first
    const int* first = &values[0];
    return *first == 1 ? 0 : 1;
}
```

## See Also

- [cpp-coll-vector-bool](coll-vector-bool.md) - the specialization with proxy references
- [cpp-coll-erase-remove](coll-erase-remove.md) - the modification pattern done in one pass
