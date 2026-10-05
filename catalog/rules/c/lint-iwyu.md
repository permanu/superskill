---
id: c-lint-iwyu
lang: c
prefix: lint
title: Keep includes to what the file actually uses
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [includes, iwyu, dependencies, hygiene]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-header-declarations, c-lint-compile-commands]
sources:
  - title: include-what-you-use
    url: https://include-what-you-use.org/
---
> Include the headers that declare what the file uses, and drop the rest.

## Why

The include-what-you-use project exists because every unnecessary include adds a dependency edge that slows builds and lets a file compile only because another header happened to pull in the declaration. The tool reports both missing and surplus includes, making the file's true dependencies explicit. Keeping the list minimal also prevents accidental reliance on transitive includes that can change.

## Bad

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int name_length(const char *s) {
    return (int)strlen(s);   /* only string.h is actually used */
}
```

## Good

```c
#include <string.h>

int name_length(const char *s) {
    return (int)strlen(s);
}
```

## See Also

- [c-proj-header-declarations](proj-header-declarations.md) - what the headers themselves may contain
- [c-lint-compile-commands](lint-compile-commands.md) - giving the tool the real include paths
