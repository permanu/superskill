---
id: cpp-unsafe-uninitialized-read
lang: cpp
prefix: unsafe
title: Initialize every object before reading it
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [uninitialized, indeterminate-value, default-initialization]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-unsafe-unsequenced, cpp-const-constinit]
sources:
  - title: cppreference - Default-initialization
    url: https://en.cppreference.com/w/cpp/language/default_initialization
  - title: cppreference - Undefined behavior
    url: https://en.cppreference.com/w/cpp/language/ub
---
> An object with no initializer holds an indeterminate value; using it is undefined.

## Why

The default-initialization reference states that when no initialization is performed, the object retains an indeterminate value until that value is replaced, and that every other use of an indeterminate value is undefined behavior — its examples mark `int e = d;` and `return b ? d : 0;` as undefined. The UB reference shows the optimizer consequence for the same defect: `std::size_t a; if (x) a = 42; return a;` can compile to `return 42` even when `x` is false. Initialize at the point of declaration.

## Bad

```cpp
int main() {
    int value; // indeterminate
    return value; // undefined: reads an indeterminate value
}
```

## Good

```cpp
int main() {
    int value = 0; // initialized at the declaration
    return value;
}
```

## See Also

- [cpp-unsafe-unsequenced](unsafe-unsequenced.md) - the other undefined-value defect
- [cpp-const-constinit](const-constinit.md) - compile-time initialization for globals
