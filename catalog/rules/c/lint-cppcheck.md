---
id: c-lint-cppcheck
lang: c
prefix: lint
title: Run a compiler-independent analyzer as a second opinion
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cppcheck, analyzer, second opinion]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-lint-clang-tidy, c-lint-valgrind]
sources:
  - title: Cppcheck - static analysis of C/C++ code (repository)
    url: https://github.com/danmar/cppcheck
---
> Add a standalone analyzer to CI so findings do not depend on one compiler.

## Why

Cppcheck is an independent static analyzer, so its heuristics differ from the compiler's and from clang-tidy's; running it adds a second set of eyes that catches conditions one tool models poorly. Its checks include null dereferences, duplicate conditions, and redundant code, and it works without a full build. The cost is one more CI step and the discipline to triage its reports.

## Bad

```c
#include <string.h>

size_t length_of(const char *s) {
    return strlen(s);   /* callers can pass NULL */
}

int main(void) {
    return (int)length_of(NULL);   /* cppcheck's nullPointer reports this */
}
```

## Good

```c
#include <stddef.h>
#include <string.h>

size_t length_or_zero(const char *s) {
    return s == NULL ? 0 : strlen(s);
}
```

## See Also

- [c-lint-clang-tidy](lint-clang-tidy.md) - the clang-based check framework
- [c-lint-valgrind](lint-valgrind.md) - the runtime counterpart
