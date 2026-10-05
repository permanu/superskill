---
id: c-unsafe-null-arith
lang: c
prefix: unsafe
title: Advance pointers only into arrays, never into arbitrary objects
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pointer arithmetic, array, non-array, "null"]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-ptr-bounds-arith, c-unsafe-pointer-compare]
sources:
  - title: SEI CERT C - ARR37-C, do not add or subtract an integer to a pointer to a non-array object
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/arrays-arr/arr37-c/
---
> Add integers only to pointers that point into an array; never walk between separate objects.

## Why

Pointer addition is defined when the pointer refers to an element of an array and the result stays inside it (or one past the end). Adding to a pointer to a stand-alone object, a struct member treated as a run, or a null pointer is undefined, and struct members are not guaranteed contiguous, so the walk reads padding. Model repeated data as an array and index it.

## Bad

```c
struct numbers {
    short a, b, c;
};

int sum(const struct numbers *n) {
    const short *p = &n->a;
    return p[0] + p[1] + p[2];   /* members are not an array */
}
```

## Good

```c
struct numbers {
    short a[3];
};

int sum(const struct numbers *n) {
    return n->a[0] + n->a[1] + n->a[2];   /* real array, defined arithmetic */
}
```

## See Also

- [c-ptr-bounds-arith](ptr-bounds-arith.md) - bounds for the array walk
- [c-unsafe-pointer-compare](unsafe-pointer-compare.md) - comparisons that require the same array
