---
id: c-data-pointer-iteration
lang: c
prefix: data
title: Iterate with a begin pointer and a one-past-the-end sentinel
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [iteration, one past the end, sentinel, pointer loop]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-ptr-bounds-arith, c-data-iterator-invalidation]
sources:
  - title: SEI CERT C - ARR30-C, do not form or use out-of-bounds pointers or array subscripts
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/arrays-arr/arr30-c/
---
> Compare against the one-past-the-end pointer with `!=`; never dereference it.

## Why

Pointers to elements of the same array compare in index order, and a pointer one past the end may be formed but not dereferenced. A loop that tests `p <= last` and then reads `*p` dereferences the sentinel on the final pass. Testing `p != last` and incrementing by one visits exactly the elements and keeps the sentinel as a pure bound.

## Bad

```c
int sum_while(int *first, int *last) {
    int total = 0;
    while (first <= last) {   /* dereferences one past the end */
        total += *first;
        ++first;
    }
    return total;
}
```

## Good

```c
int sum_range(int *first, int *last) {
    int total = 0;
    for (int *p = first; p != last; ++p) {   /* last is one past the end */
        total += *p;
    }
    return total;
}
```

## See Also

- [c-ptr-bounds-arith](ptr-bounds-arith.md) - what may be formed and dereferenced
- [c-data-iterator-invalidation](data-iterator-invalidation.md) - when the pointers stop being valid
