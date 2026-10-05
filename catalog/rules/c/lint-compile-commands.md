---
id: c-lint-compile-commands
lang: c
prefix: lint
title: Generate a compile command database for tooling
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [compile_commands.json, clangd, flags, tooling]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-lint-clang-tidy, c-proj-feature-macros]
sources:
  - title: Clang - JSON Compilation Database Format Specification
    url: https://clang.llvm.org/docs/JSONCompilationDatabase.html
---
> Emit `compile_commands.json` from the build so every tool sees the real flags.

## Why

Clang's compilation database specification exists so tools can replay the exact command line used for each file, including include paths and defines. Without it, editors, clang-tidy, and indexers guess flags and either miss errors or report false ones. A defaulted configuration macro in a header keeps the file's meaning visible even when a tool does not have the database.

## Bad

```c
/* The build passes -DBUFFER_SIZE=4096; no other tool can see that value. */
int buffer_size(void) {
    return 4096;
}
```

## Good

```c
#ifndef BUFFER_SIZE
#define BUFFER_SIZE 4096   /* default visible to editors and analyzers */
#endif

int buffer_size(void) {
    return BUFFER_SIZE;
}
```

## See Also

- [c-lint-clang-tidy](lint-clang-tidy.md) - the tool that most needs the database
- [c-proj-feature-macros](proj-feature-macros.md) - where build flags are decided
