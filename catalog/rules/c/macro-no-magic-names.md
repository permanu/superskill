---
id: c-macro-no-magic-names
lang: c
prefix: macro
title: Macros must not depend on magic local names
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [macro, local variables, hidden dependency, magic name]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-macro-param-parens, c-anti-function-macro]
sources:
  - title: Linux kernel coding style - Macros, Enums and RTL
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Pass everything the macro needs as a parameter; never require a local variable of a particular name.

## Why

Kernel style warns that macros depending on a local variable with a magic name are confusing and break from innocent changes, such as renaming the variable or shadowing it. A macro that only works inside one function is a function in disguise. Parameters make the dependencies visible at the call site.

## Bad

```c
#define FETCH() values[index]

int lookup(const int *values, int index) {
    return FETCH();   /* depends on locals named values and index */
}
```

## Good

```c
static int fetch(const int *values, int index) {
    return values[index];
}

int lookup(const int *values, int index) {
    return fetch(values, index);   /* the dependency is a parameter */
}
```

## See Also

- [c-macro-param-parens](macro-param-parens.md) - passing values in safely
- [c-anti-function-macro](anti-function-macro.md) - turning such macros into functions
