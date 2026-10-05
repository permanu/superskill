---
id: c-data-memcpy-shallow
lang: c
prefix: data
title: memcpy copies pointers, not the objects they point to
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [memcpy, shallow copy, deep copy, pointer]
  files: ["**/*.c", "**/*.h"]
  symbols: [memcpy]
related: [c-mem-use-after-free, c-sec-string-bounds]
sources:
  - title: cppreference - memcpy
    url: https://en.cppreference.com/w/c/string/byte/memcpy
---
> Copy owned objects explicitly; a byte copy of a struct duplicates only the pointer values.

## Why

`memcpy` copies the bytes of the source object, which for a struct containing a pointer means both copies now reference the same allocation. Freeing or mutating one affects the other, and the double ownership turns into a double free or a use-after-free. Structures with owned members need a copy function that duplicates each object.

## Bad

```c
#include <string.h>

struct config {
    char *name;
    int retries;
};

void copy_config(struct config *dst, const struct config *src) {
    memcpy(dst, src, sizeof *dst);   /* copies the pointer, not the name */
}
```

## Good

```c
#include <stdlib.h>
#include <string.h>

struct config {
    char *name;
    int retries;
};

int copy_config(struct config *dst, const struct config *src) {
    *dst = *src;
    dst->name = malloc(strlen(src->name) + 1);
    if (dst->name == NULL) {
        return -1;
    }
    strcpy(dst->name, src->name);   /* deep-copy the owned string */
    return 0;
}
```

## See Also

- [c-mem-use-after-free](mem-use-after-free.md) - the shared lifetime this creates
- [c-sec-string-bounds](sec-string-bounds.md) - sizing the duplicated string
