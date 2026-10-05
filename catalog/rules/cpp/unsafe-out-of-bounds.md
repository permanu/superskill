---
id: cpp-unsafe-out-of-bounds
lang: cpp
prefix: unsafe
title: Keep array accesses inside the bounds
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [out-of-bounds, array, indexing, undefined-behavior]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-unsafe-no-deref-invalid, cpp-sec-bounds-checked]
sources:
  - title: cppreference - Undefined behavior
    url: https://en.cppreference.com/w/cpp/language/ub
  - title: cppreference - Arithmetic operators
    url: https://en.cppreference.com/w/cpp/language/operator_arithmetic
---
> One-past-the-end is a valid pointer, not a valid element.

## Why

The UB reference lists memory accesses outside of array bounds among its examples and shows the optimizer consequence: a loop with `i <= 4` over `int table[4]` can be compiled as if it always returns true. The arithmetic reference adds the pointer rule: P + J is defined only while the result stays within [0, n] of the array, and other values are undefined behavior. The last valid element is at size - 1; the one-past-the-end pointer can be formed but not read.

## Bad

```cpp
int main() {
    int table[4] = {};
    int sum = 0;
    for (int i = 0; i <= 4; ++i) // i == 4 is out of bounds
        sum += table[i];
    return sum;
}
```

## Good

```cpp
int main() {
    int table[4] = {};
    int sum = 0;
    for (int i = 0; i < 4; ++i) // stays within bounds
        sum += table[i];
    return sum;
}
```

## See Also

- [cpp-unsafe-no-deref-invalid](unsafe-no-deref-invalid.md) - the access that goes wrong
- [cpp-sec-bounds-checked](sec-bounds-checked.md) - bounds checks for untrusted indices
