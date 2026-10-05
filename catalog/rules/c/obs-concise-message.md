---
id: c-obs-concise-message
lang: c
prefix: obs
title: State what failed and the value that caused it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [log message, context, actionable, diagnostics]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-obs-module-tag, c-err-errno-capture]
sources:
  - title: Linux kernel coding style - Printing kernel messages
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Name the operation and include the identifier or value needed to act on the message.

## Why

Kernel style asks for messages that are concise, clear, and unambiguous, and warns that decorative parenthesized numbers add no value. A message like `something went wrong` cannot be acted on; one that says `open_port: cannot bind port 8080` names the operation and the value, so an operator can reproduce or fix the condition. Context is the difference between a log and noise.

## Bad

```c
#include <stdio.h>

int open_port(int port) {
    fprintf(stderr, "something went wrong (%d)\n", port);   /* what failed? */
    return -1;
}
```

## Good

```c
#include <stdio.h>

int open_port(int port) {
    fprintf(stderr, "open_port: cannot bind port %d\n", port);
    return -1;
}
```

## See Also

- [c-obs-module-tag](obs-module-tag.md) - the subsystem part of the context
- [c-err-errno-capture](err-errno-capture.md) - preserving the error detail while reporting
