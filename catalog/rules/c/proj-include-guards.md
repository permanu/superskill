---
id: c-proj-include-guards
lang: c
prefix: proj
title: Wrap every header in an include guard with a non-reserved macro name
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [include guard, header, ifndef, multiple inclusion]
  files: ["**/*.h"]
  symbols: []
related: [c-proj-reserved-identifiers, c-proj-header-declarations]
sources:
  - title: GCC - The C Preprocessor, Once-Only Headers
    url: https://gcc.gnu.org/onlinedocs/cpp/Once-Only-Headers.html
  - title: SEI CERT C - DCL37-C, do not declare or define a reserved identifier
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/declarations-and-initialization-dcl/dcl37-c/
---
> Enclose each header's contents in `#ifndef`/`#define`/`#endif` with a name derived from the file.

## Why

A header included twice is processed twice, which redefines structs and macros and fails the build; the guard makes the second inclusion a no-op and lets the preprocessor skip the file entirely. The guard macro must not begin with an underscore, because leading-underscore names are reserved for the implementation. Name it after the file and add a suffix that makes collisions unlikely.

## Bad

```c
/* counter.h - no include guard */
struct counter {
    int value;
};
```

## Good

```c
/* counter.h */
#ifndef COUNTER_H
#define COUNTER_H

struct counter {
    int value;
};

#endif /* COUNTER_H */
```

## See Also

- [c-proj-reserved-identifiers](proj-reserved-identifiers.md) - why `_COUNTER_H` would be wrong
- [c-proj-header-declarations](proj-header-declarations.md) - what belongs inside the guard
