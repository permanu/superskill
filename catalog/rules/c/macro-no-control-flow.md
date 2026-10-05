---
id: c-macro-no-control-flow
lang: c
prefix: macro
title: Macros must not contain return, break, or continue
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [macro, control flow, return, hidden exit]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-macro-do-while, c-anti-function-macro]
sources:
  - title: Linux kernel coding style - Macros, Enums and RTL
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Keep control-flow statements out of macros; make the caller's exit visible at the call site.

## Why

Kernel style calls macros that affect control flow a very bad idea because a call that looks like a function can return from the calling function, which breaks the reader's model of the code. Error handling hidden in a macro also makes the function's exit points invisible to tools and reviewers. Use a function that returns a status and let the caller branch.

## Bad

```c
#define CHECK(x) do { if (!(x)) return -1; } while (0)

int f(int v) {
    CHECK(v > 0);
    return v;
}
```

## Good

```c
static int check_positive(int v) {
    return v > 0 ? 0 : -1;
}

int f(int v) {
    if (check_positive(v) != 0) {
        return -1;   /* control flow is visible at the call site */
    }
    return v;
}
```

## See Also

- [c-macro-do-while](macro-do-while.md) - wrapping the statements that remain
- [c-anti-function-macro](anti-function-macro.md) - replacing function-like macros altogether
