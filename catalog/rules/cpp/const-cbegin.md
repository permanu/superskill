---
id: cpp-const-cbegin
lang: cpp
prefix: const
title: Traverse read-only ranges with cbegin and cend
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cbegin, cend, const_iterator, traversal]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [cbegin, cend]
related: [cpp-coll-range-for, cpp-const-immutable-by-default]
sources:
  - title: cppreference - std::vector
    url: https://en.cppreference.com/w/cpp/container/vector
  - title: cppreference - cv type qualifiers
    url: https://en.cppreference.com/w/cpp/language/cv
---
> cbegin returns a const_iterator; the loop states that it cannot write.

## Why

The vector reference provides `cbegin` and `cend` alongside `begin` and `end`: the const versions return `const_iterator`s, which cannot modify the elements they point to. A read-only loop written with the non-const iterators takes mutable access it never uses, and stops compiling the moment the container is declared const — which is exactly the state a reader-only function should accept. Choosing the const pair keeps the traversal usable on const objects and documents the intent at the loop header.

## Bad

```cpp
#include <vector>

int main() {
    std::vector<int> values{1, 2, 3};
    std::vector<int>::iterator it = values.begin(); // mutable access for a read
    return *it == 1 ? 0 : 1;
}
```

## Good

```cpp
#include <vector>

int main() {
    const std::vector<int> values{1, 2, 3};
    auto it = values.cbegin(); // read-only iterator
    return *it == 1 ? 0 : 1;
}
```

## See Also

- [cpp-coll-range-for](coll-range-for.md) - the traversal form that takes constness from the range
- [cpp-const-immutable-by-default](const-immutable-by-default.md) - making the container const
