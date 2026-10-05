---
id: c-macro-token-paste
lang: c
prefix: macro
title: Expand arguments through a helper before token pasting
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [token pasting, "##", macro expansion, concatenation]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-macro-param-parens, c-macro-constexpr]
sources:
  - title: GCC - The C Preprocessor, Concatenation
    url: https://gcc.gnu.org/onlinedocs/cpp/Concatenation.html
---
> Paste in a two-level macro so arguments are macro-expanded before the paste.

## Why

GCC's manual states that when a parameter sits next to `##`, it is replaced by its actual argument before pasting, and the argument is not macro-expanded first. So `JOIN(PREFIX, _id)` produces `PREFIX_id` rather than `user_id`, and the bug is invisible because both are valid identifiers. An intermediate macro performs the expansion before the pasting macro runs.

## Bad

```c
#define PREFIX user
#define JOIN(a, b) a##b

int JOIN(PREFIX, _id)(void) {   /* PREFIX is not expanded before pasting */
    return 0;
}
```

## Good

```c
#define PREFIX user
#define JOIN(a, b) a##b
#define EXPAND_JOIN(a, b) JOIN(a, b)

int EXPAND_JOIN(PREFIX, _id)(void) {   /* two levels expand before pasting */
    return 0;
}
```

## See Also

- [c-macro-param-parens](macro-param-parens.md) - the other substitution rule
- [c-macro-constexpr](macro-constexpr.md) - replacing name-building macros with constants
