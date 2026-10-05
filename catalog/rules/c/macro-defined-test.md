---
id: c-macro-defined-test
lang: c
prefix: macro
title: Test macro existence with defined, not truthiness
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [defined, preprocessor conditional, ifdef, undefined]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-feature-macros, c-anti-ifdef-in-source]
sources:
  - title: cppreference - Conditional inclusion
    url: https://en.cppreference.com/w/c/preprocessor/conditional
---
> Use `#if defined(X)` when asking whether a macro exists; an undefined identifier is not an error there.

## Why

In `#if`, an identifier that is not defined is replaced by zero, so `#if FEATURE` tests a value while `#ifdef FEATURE` tests existence. The two differ when the macro is defined as zero, which is common for build switches: `#if FEATURE` then behaves as if it were absent, and a typo in the name silently evaluates to false. `defined` states the question being asked.

## Bad

```c
#if FEATURE_X
#define ENABLED 1
#else
#define ENABLED 0
#endif
```

## Good

```c
#if defined(FEATURE_X)
#define ENABLED 1
#else
#define ENABLED 0
#endif
```

## See Also

- [c-proj-feature-macros](proj-feature-macros.md) - where these switches are decided
- [c-anti-ifdef-in-source](anti-ifdef-in-source.md) - keeping the conditionals out of functions
