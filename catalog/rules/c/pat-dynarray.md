---
id: c-pat-dynarray
lang: c
prefix: pat
title: Keep growable arrays in a struct that tracks length and capacity
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dynamic array, capacity, realloc, vector]
  files: ["**/*.c", "**/*.h"]
  symbols: [realloc]
related: [c-mem-flex-array, c-err-alloc-failure]
sources:
  - title: cppreference - realloc
    url: https://en.cppreference.com/w/c/memory/realloc
---
> Track capacity separately from length and grow through one function.

## Why

A bare pointer plus a length forces every push to reallocate, which is quadratic, and leaves the capacity unknowable. Keeping the capacity in the struct lets growth happen in geometric steps, lets the owner see how much room is left, and gives the failure path from `realloc` a single place to live. One grow function owns the reallocation, so the temporary-pointer rule is applied once.

## Bad

```c
#include <stdlib.h>

int push(int **items, size_t *count, int value) {
    int *grown = realloc(*items, (*count + 1) * sizeof **items);
    if (grown == NULL) {
        return -1;
    }
    *items = grown;
    (*items)[(*count)++] = value;   /* capacity is recomputed every push */
    return 0;
}
```

## Good

```c
#include <stdlib.h>

struct int_vec {
    int *items;
    size_t len;
    size_t cap;
};

int vec_push(struct int_vec *v, int value) {
    if (v->len == v->cap) {
        size_t next = v->cap == 0 ? 8 : v->cap * 2;
        int *grown = realloc(v->items, next * sizeof *grown);
        if (grown == NULL) {
            return -1;
        }
        v->items = grown;
        v->cap = next;
    }
    v->items[v->len++] = value;   /* one grow function owns the capacity */
    return 0;
}
```

## See Also

- [c-mem-flex-array](mem-flex-array.md) - the fixed-tail alternative when the size never grows
- [c-err-alloc-failure](err-alloc-failure.md) - the realloc discipline inside the grow step
