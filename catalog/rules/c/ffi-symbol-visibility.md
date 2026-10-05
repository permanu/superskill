---
id: c-ffi-symbol-visibility
lang: c
prefix: ffi
title: Hide internal symbols in shared libraries
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [visibility, shared library, exported symbols, ABI]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-internal-linkage, c-ffi-shared-prototypes]
sources:
  - title: GCC - Common Attributes (visibility)
    url: https://gcc.gnu.org/onlinedocs/gcc/Common-Attributes.html#Common-Function-Attributes
---
> Mark helpers hidden and export only the documented API from a shared library.

## Why

In a shared library every global symbol is exported by default, so internal helpers become part of the ABI, collide with symbols in other libraries, and prevent the linker from optimizing across them. The visibility attribute keeps a symbol inside the library while it stays a normal external definition for its own translation units. The exported set then equals the documented set.

## Bad

```c
int internal_helper(void) {
    return 1;   /* exported from the shared library by default */
}
```

## Good

```c
__attribute__((visibility("hidden")))
int internal_helper(void) {
    return 1;   /* not exported from the shared library */
}
```

## See Also

- [c-proj-internal-linkage](proj-internal-linkage.md) - the same discipline within one program
- [c-ffi-shared-prototypes](ffi-shared-prototypes.md) - the declarations that should be exported
