---
id: c-ptr-fn-pointer-cast
lang: c
prefix: ptr
title: Invoke function pointers only through their declared function type
severity: must
enforce: tool
tool: clang:-Wcast-function-type-strict
baseline: latest
status: verified
triggers:
  keywords: [function pointer, callback, cast, signature]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-ptr-strict-alias, c-ptr-null-check]
sources:
  - title: Clang - Diagnostic flags reference
    url: https://clang.llvm.org/docs/DiagnosticsReference.html
  - title: cppreference - Pointer declaration
    url: https://en.cppreference.com/w/c/language/pointer
  - title: WG14 N3220 - Working Draft (open-std.org)
    url: https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3220.pdf
---
> Keep a callback's pointer type exact and call it with the signature it was declared with.

## Why

A function pointer's callable type is part of its contract; calling through a converted pointer whose type is not compatible with the referenced function is undefined behavior (working draft 6.3.2.3p8), even when the argument counts happen to line up. Casting between callback signatures hides the mismatch from the compiler and breaks silently when either side changes. Clang's `-Wcast-function-type-strict` reports exactly these conversions.

## Bad

```c
typedef int (*compare_fn)(const void *, const void *);

int use_wrong_type(compare_fn fn) {
    int (*as_int)(int) = (int (*)(int))fn;   /* incompatible signature */
    return as_int(1);                        /* undefined behavior */
}
```

## Good

```c
typedef int (*compare_fn)(const void *, const void *);

int use_same_type(compare_fn fn, const int *a, const int *b) {
    return fn(a, b);   /* called through the type it was declared with */
}
```

## See Also

- [c-ptr-strict-alias](ptr-strict-alias.md) - the same type-contract principle for objects
- [c-ptr-null-check](ptr-null-check.md) - validating a callback before the call
