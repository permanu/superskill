---
id: c-type-alignof
lang: c
prefix: type
title: Query alignment with alignof instead of assuming a value
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [alignof, alignment, portability, assumption]
  files: ["**/*.c", "**/*.h"]
  symbols: [alignof]
related: [c-ptr-alignment-cast, c-type-alignas]
sources:
  - title: cppreference - alignof operator
    url: https://en.cppreference.com/w/c/language/_Alignof
---
> Ask the implementation for a type's alignment requirement; never hard-code the number.

## Why

`alignof` yields the alignment requirement of its type operand, which varies with the target and ABI: a `long` is aligned to 8 bytes on some systems and 4 on others, and 64-bit types have different rules on 32-bit platforms. A hard-coded assumption is correct only where it was measured and breaks silently elsewhere, typically as an unaligned access or a failed alignment check.

## Bad

```c
int assumed_alignment(void) {
    return 8;   /* guessed alignment of a long */
}
```

## Good

```c
int actual_alignment(void) {
    return (int)alignof(long);   /* ask the implementation */
}
```

## See Also

- [c-ptr-alignment-cast](ptr-alignment-cast.md) - where wrong alignment assumptions end
- [c-type-alignas](type-alignas.md) - requesting an alignment the default does not provide
