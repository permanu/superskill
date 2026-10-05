---
id: c-anti-goto-control-flow
lang: c
prefix: anti
title: Do not use goto for ordinary control flow
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [goto, loop, control flow, spaghetti]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-err-goto-cleanup, c-anti-deep-nesting]
sources:
  - title: SEI CERT C - MEM12-C, consider using a goto chain when leaving a function on error when using and releasing resources
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/memory-management-mem/mem12-c/
  - title: Linux kernel coding style - Centralized exiting of functions
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Restrict goto to forward jumps into a cleanup chain; express loops and branches with the language constructs.

## Why

Both CERT and kernel style endorse goto only for one purpose: transferring control to the cleanup labels at the end of a function. Backward gotos and gotos that skip ordinary logic reconstruct loops and branches without their scoping and their intent, and they make control flow hard to follow. The loop keywords are clearer and keep invariants visible.

## Bad

```c
int scan(int *values, int n) {
    int i = 0;
retry:
    if (i < n && values[i] < 0) {
        ++i;
        goto retry;   /* goto used as a loop */
    }
    return i;
}
```

## Good

```c
int scan(int *values, int n) {
    int i = 0;
    while (i < n && values[i] < 0) {
        ++i;
    }
    return i;
}
```

## See Also

- [c-err-goto-cleanup](err-goto-cleanup.md) - the one accepted use of goto
- [c-anti-deep-nesting](anti-deep-nesting.md) - the same control flow written with guards
