---
id: cpp-coll-map-find
lang: cpp
prefix: coll
title: Look up map entries with find or contains; operator[] inserts
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [map, "operator[]", find, contains, insertion]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::map]
related: [cpp-coll-lower-bound, cpp-coll-vector-default]
sources:
  - title: cppreference - std::map
    url: https://en.cppreference.com/w/cpp/container/map
  - title: cppreference - std::vector
    url: https://en.cppreference.com/w/cpp/container/vector
---
> operator[] is "access or insert"; a lookup with it creates the entry it fails to find.

## Why

The map reference labels `operator[]` as "access or insert specified element", and its example notes that using it with a non-existent key always performs an insert — the entry is value-initialized and the container grows. A lookup written with `operator[]` therefore mutates the data it was asked to inspect, changes `size()`, and can hide bugs behind a default value. The lookup functions — `find`, `contains`, `count`, `at` — report absence without creating anything.

## Bad

```cpp
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> counts{{"cpu", 4}};
    if (counts["gpu"] == 0) // inserts a "gpu" entry to read it
        std::cout << "no gpu entry\n";
    return counts.size() == 1 ? 0 : 1; // the size check now fails
}
```

## Good

```cpp
#include <iostream>
#include <map>
#include <string>

int main() {
    const std::map<std::string, int> counts{{"cpu", 4}};
    if (counts.find("gpu") == counts.end()) // no insertion
        std::cout << "no gpu entry\n";
    return counts.size() == 1 ? 0 : 1;
}
```

## See Also

- [cpp-coll-lower-bound](coll-lower-bound.md) - ordered lookup in sorted ranges
- [cpp-coll-vector-default](coll-vector-default.md) - choosing the container by its operations
