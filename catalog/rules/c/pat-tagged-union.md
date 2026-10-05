---
id: c-pat-tagged-union
lang: c
prefix: pat
title: Pair a union with a tag and read only the member the tag selects
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tagged union, variant, discriminator, union]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-unsafe-union-active, c-pat-vtable]
sources:
  - title: cppreference - union declaration
    url: https://en.cppreference.com/w/c/language/union
---
> Store the discriminant next to the union and switch on it before touching a member.

## Why

At most one union member holds a value at a time, so code must know which one that is; a separate tag records it. Reading a member the tag does not select reinterprets unrelated bytes. The tag also makes the variant self-describing when it is passed across a boundary, where the reader cannot see how it was built.

## Bad

```c
struct value {
    union {
        long i;
        double d;
    } as;   /* which member is active? */
};
```

## Good

```c
enum value_kind { VALUE_INT, VALUE_DOUBLE };

struct value {
    enum value_kind kind;
    union {
        long i;
        double d;
    } as;
};

double value_as_double(const struct value *v) {
    if (v->kind != VALUE_DOUBLE) {
        return 0.0;   /* the tag says which member is live */
    }
    return v->as.d;
}
```

## See Also

- [c-unsafe-union-active](unsafe-union-active.md) - why the wrong member cannot be read
- [c-pat-vtable](pat-vtable.md) - the alternative when behavior, not data, varies
