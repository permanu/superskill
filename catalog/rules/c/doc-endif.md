---
id: c-doc-endif
lang: c
prefix: doc
title: Annotate every #endif with the condition it closes
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [endif, preprocessor, comments, nesting]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-include-guards, c-doc-what-not-how]
sources:
  - title: Linux kernel coding style - Conditional Compilation
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Put the condition in a comment after `#endif` whenever the block is more than a few lines.

## Why

Preprocessor conditionals nest, and a bare `#endif` gives the reader no way to tell which branch just ended without scrolling back. The comment costs one line and removes the ambiguity, especially in headers where include guards and feature conditionals stack. Kernel style asks for it on every non-trivial block.

## Bad

```c
#ifndef CONFIG_H
#define CONFIG_H
#define MAX_ITEMS 64
#endif
```

## Good

```c
#ifndef CONFIG_H
#define CONFIG_H
#define MAX_ITEMS 64
#endif /* CONFIG_H */
```

## See Also

- [c-proj-include-guards](proj-include-guards.md) - the guard whose `#endif` this annotates
- [c-doc-what-not-how](doc-what-not-how.md) - comments that add information rather than noise
