---
id: c-unsafe-bitfield-layout
lang: c
prefix: unsafe
title: Serialize bit-fields with explicit arithmetic, not memory layout
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bit-field, layout, packing, serialization]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-unsafe-union-active, c-unsafe-padding-compare]
sources:
  - title: cppreference - Bit-field
    url: https://en.cppreference.com/w/c/language/bit_field
---
> Build and read wire values with shifts and masks; never cast a bit-field struct to bytes.

## Why

Bit-field allocation order, straddling, and the signedness of a plain `int` bit-field are implementation-defined, so the bytes of a struct do not form a portable format. Code that serializes a bit-field struct by reading its memory produces different bytes per compiler and target, and the receiving side misparses flags. Pack and unpack the fields explicitly.

## Bad

```c
struct flags {
    unsigned a : 1;
    unsigned b : 7;
};

unsigned char encode(struct flags f) {
    return *(unsigned char *)&f;   /* relies on implementation-defined layout */
}
```

## Good

```c
struct flags {
    unsigned a : 1;
    unsigned b : 7;
};

unsigned char encode(struct flags f) {
    return (unsigned char)((f.b << 1) | f.a);   /* explicit wire layout */
}
```

## See Also

- [c-unsafe-union-active](unsafe-union-active.md) - reinterpreting bytes through the wrong type
- [c-unsafe-padding-compare](unsafe-padding-compare.md) - the padding that joins the layout
