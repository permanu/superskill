---
id: c-obs-module-tag
lang: c
prefix: obs
title: Tag every message with its module
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [log prefix, module, tag, diagnostics]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-obs-levels, c-obs-concise-message]
sources:
  - title: Linux kernel coding style - Printing kernel messages
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Prefix messages with the module or subsystem so one log stream can be attributed and filtered.

## Why

Kernel style insists messages be matched to the right device and driver, which is what the `dev_*` helpers encode. In a program that prints from several modules, an untagged `unexpected token` gives no clue which parser or which file produced it. A stable module prefix turns a flat stream into something that can be grouped per subsystem.

## Bad

```c
#include <stdio.h>

void parse_error(int line) {
    fprintf(stderr, "unexpected token\n");   /* which subsystem? */
}
```

## Good

```c
#include <stdio.h>

void parse_error(int line) {
    fprintf(stderr, "config-parser: unexpected token at line %d\n", line);
}
```

## See Also

- [c-obs-levels](obs-levels.md) - the severity that complements the module tag
- [c-obs-concise-message](obs-concise-message.md) - what else the message should carry
