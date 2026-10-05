---
id: c-conv-enum-underlying
lang: c
prefix: conv
title: Give enums that cross a boundary a fixed underlying type
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [enum, underlying type, wire format, ABI]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-conv-fixed-width, c-unsafe-bitfield-layout]
sources:
  - title: cppreference - enum declaration
    url: https://en.cppreference.com/w/c/language/enum
---
> Declare a fixed underlying type for enums stored in files, protocols, or shared memory.

## Why

An enum without a fixed underlying type has an implementation-defined width and signedness chosen to fit its enumerators, so its size and representation can differ across compilers and targets. Any enum that is serialized, compared across a boundary, or exposed in an ABI needs a declared underlying type. The fixed form makes the storage width part of the declaration.

## Bad

```c
enum status { STATUS_OK, STATUS_FAIL };

int wire_value(enum status s) {
    return (int)s;   /* underlying type is implementation-defined */
}
```

## Good

```c
enum status : unsigned char { STATUS_OK, STATUS_FAIL };

int wire_value(enum status s) {
    return (int)s;   /* fixed underlying type: width is part of the contract */
}
```

## See Also

- [c-conv-fixed-width](conv-fixed-width.md) - the same width discipline for integers
- [c-unsafe-bitfield-layout](unsafe-bitfield-layout.md) - other representation assumptions
