---
id: cpp-unsafe-pointer-compare
lang: cpp
prefix: unsafe
title: Compare pointers only within the same array
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pointer-comparison, ordering, arrays]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-unsafe-out-of-bounds, cpp-coll-invalidation]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Arithmetic operators
    url: https://en.cppreference.com/w/cpp/language/operator_arithmetic
---
> Ordering is defined for pointers into one array; across arrays it has no defined result.

## Why

ES.62 is "Don't compare pointers into different arrays". The arithmetic reference defines pointer subtraction only for pointers into the same array or the same complete object and makes the other cases undefined, and the corresponding ordering of unrelated pointers has no defined answer to rely on. Compare positions within one array, or compare indices rather than addresses.

## Bad

```cpp
int main() {
    int first[4] = {1, 2, 3, 4};
    int second[4] = {1, 2, 3, 4};
    return &first[0] < &second[0] ? 0 : 1; // pointers into different arrays
}
```

## Good

```cpp
int main() {
    int values[4] = {1, 2, 3, 4};
    const int* begin = &values[0];
    const int* end = &values[3];
    return begin < end ? 0 : 1; // same array: ordering is defined
}
```

## See Also

- [cpp-unsafe-out-of-bounds](unsafe-out-of-bounds.md) - staying inside one array
- [cpp-coll-invalidation](coll-invalidation.md) - pointers that outlive their container
