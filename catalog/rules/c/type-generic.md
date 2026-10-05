---
id: c-type-generic
lang: c
prefix: type
title: Dispatch on type with _Generic instead of parallel accessor names
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [_Generic, type dispatch, generic macro]
  files: ["**/*.c", "**/*.h"]
  symbols: [_Generic]
related: [c-type-bit-int, c-macro-param-parens]
sources:
  - title: cppreference - Generic selection
    url: https://en.cppreference.com/w/c/language/generic
---
> Let `_Generic` choose the implementation from the argument's type; callers should not name the variant.

## Why

Generic selection maps the controlling expression's type to one of several expressions, so a macro can present one name for all supported types. Parallel accessor names such as `name_of_int` and `name_of_long` put the type choice on the caller, where a wrong pick compiles when the types are compatible. `_Generic` moves the choice to the type itself.

## Bad

```c
enum kind { KIND_INT, KIND_LONG };

const char *name_of(enum kind k) {
    return k == KIND_INT ? "int" : "long";   /* every new type edits this function */
}
```

## Good

```c
#define name_of(x) _Generic((x), int: "int", long: "long", default: "other")

const char *name = name_of(1L);   /* dispatch is derived from the type */
```

## See Also

- [c-type-bit-int](type-bit-int.md) - a type a generic macro may need to handle
- [c-macro-param-parens](macro-param-parens.md) - the macro hygiene that applies here
