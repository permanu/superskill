---
id: c-doc-deprecated
lang: c
prefix: doc
title: Mark retiring APIs with the deprecated attribute and a replacement
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deprecated, attribute, migration, API]
  files: ["**/*.c", "**/*.h"]
  symbols: [deprecated]
related: [c-doc-nodiscard-reason, c-doc-contract]
sources:
  - title: cppreference - C attribute, deprecated
    url: https://en.cppreference.com/w/c/language/attributes/deprecated
---
> Put `[[deprecated("use X instead")]]` on every declaration callers must migrate away from.

## Why

A comment that says "old" is invisible to the compiler and to anyone who does not read the header. The `deprecated` attribute makes each use a compiler warning, which puts the migration in front of the person who can act on it, at the call site. The message turns the warning into a migration instruction by naming the replacement.

## Bad

```c
int old_lookup(int key);   /* callers get no warning */
```

## Good

```c
[[deprecated("use lookup_v2, which reports errors")]]
int old_lookup(int key);
```

## See Also

- [c-doc-nodiscard-reason](doc-nodiscard-reason.md) - the same reason-string pattern for results
- [c-doc-contract](doc-contract.md) - documenting the replacement's contract
