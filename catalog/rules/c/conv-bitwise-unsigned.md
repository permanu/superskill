---
id: c-conv-bitwise-unsigned
lang: c
prefix: conv
title: Apply bitwise operators to unsigned operands only
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bitwise, unsigned, shift, mask, sign bit]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-conv-promotion, c-unsafe-shift-range]
sources:
  - title: SEI CERT C - INT13-C, use bitwise operators only on unsigned operands
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/integers-int/int13-c/
---
> Declare operands of `~`, `&`, `|`, `^`, and shifts as unsigned so results depend on value, not representation.

## Why

Bitwise results on signed types depend on the sign representation: right shift of a negative value is implementation-defined (arithmetic or logical), left shift can overflow into the sign bit, and `~` produces an implementation-defined negative value. Unsigned operands give the same bit-level result on every conforming implementation and keep the type of the expression predictable.

## Bad

```c
int toggle(int value, int bit) {
    return value ^ (1 << bit);   /* signed shifts and masks */
}
```

## Good

```c
unsigned toggle(unsigned value, unsigned bit) {
    return value ^ (1u << bit);   /* unsigned operands throughout */
}
```

## See Also

- [c-conv-promotion](conv-promotion.md) - why small unsigned types still compute as int
- [c-unsafe-shift-range](unsafe-shift-range.md) - bounding the shift count itself
