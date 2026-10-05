---
id: c-macro-no-lvalue-args
lang: c
prefix: macro
title: Do not design macros that are used as lvalues
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [macro, lvalue, assignment, function replacement]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-anti-function-macro, c-macro-no-magic-names]
sources:
  - title: Linux kernel coding style - Macros, Enums and RTL
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Return values from functions and assign explicitly instead of hiding the assignment in a macro.

## Why

Kernel style warns that a macro used as an lvalue bites when it is later replaced by an inline function, because the assignment no longer has a target. Code written against a macro's assignable expansion also hides a side effect in an expression that reads like a value. Keep the assignment a statement of its own.

## Bad

```c
#define CURRENT() (*current_slot())

int *current_slot(void);

int use_slot(void) {
    CURRENT() = 5;   /* macro expands to an lvalue */
    return CURRENT();
}
```

## Good

```c
int *current_slot(void);

int use_slot(void) {
    int *slot = current_slot();
    *slot = 5;   /* assignment is explicit, not hidden in a macro */
    return *slot;
}
```

## See Also

- [c-anti-function-macro](anti-function-macro.md) - the conversion that breaks lvalue macros
- [c-macro-no-magic-names](macro-no-magic-names.md) - the other hidden dependency
