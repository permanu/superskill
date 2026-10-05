---
id: c-proj-format
lang: c
prefix: proj
title: Enforce one formatter configuration and check it in CI
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [clang-format, formatting, CI, style]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-warning-level, c-proj-static-analysis]
sources:
  - title: Clang - ClangFormat
    url: https://clang.llvm.org/docs/ClangFormat.html
---
> Check in a formatter configuration and fail CI when files are not formatted with it.

## Why

Hand-formatted code drifts into mixed brace placement, indentation, and line breaking, which makes diffs noisy and reviews argue about whitespace instead of behavior. `clang-format` with a checked-in configuration makes formatting mechanical and reproducible; a CI check turns it into a gate. Style decisions happen once, in the configuration file.

## Bad

```c
int clamp(int v) {
  if (v < 0) {
        return 0; }
  return v; }
```

## Good

```c
int clamp(int v) {
    if (v < 0) {
        return 0;
    }
    return v;
}
```

## See Also

- [c-proj-warning-level](proj-warning-level.md) - the other CI gate on the build
- [c-proj-static-analysis](proj-static-analysis.md) - checks that go beyond formatting
