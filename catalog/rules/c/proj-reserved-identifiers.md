---
id: c-proj-reserved-identifiers
lang: c
prefix: proj
title: Never declare or define an identifier reserved by the standard
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [reserved identifier, namespace, underscore, standard library]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-include-guards, c-proj-internal-linkage]
sources:
  - title: SEI CERT C - DCL37-C, do not declare or define a reserved identifier
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/declarations-and-initialization-dcl/dcl37-c/
---
> Keep leading underscores and standard library names out of your identifiers, even for static objects.

## Why

Identifiers beginning with two underscores, or with an underscore and an uppercase letter, are reserved for any use, and any identifier beginning with an underscore is reserved at file scope; the standard library's names are reserved for external linkage. Defining one is undefined behavior and can collide with a macro or symbol the implementation introduces later. Reserved-looking names are not safe even when they are `static`, because headers may declare them.

## Bad

```c
#include <stddef.h>

int open(const char *path) {   /* collides with the standard library's open */
    return path != NULL;
}
```

## Good

```c
#include <stddef.h>

int module_open(const char *path) {   /* module-prefixed, no collision */
    return path != NULL;
}
```

## See Also

- [c-proj-include-guards](proj-include-guards.md) - guard names that stay out of the reserved space
- [c-proj-internal-linkage](proj-internal-linkage.md) - limiting which names are exported at all
