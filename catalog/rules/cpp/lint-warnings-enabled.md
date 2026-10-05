---
id: cpp-lint-warnings-enabled
lang: cpp
prefix: lint
title: Compile with the standard warning sets enabled
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [warnings, wall, wextra, build]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-lint-werror, cpp-lint-pedantic]
sources:
  - title: GCC - Options to Request or Suppress Warnings
    url: https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html
---
> -Wall and -Wextra turn on the checks that catch the avoidable mistakes.

## Why

The GCC warning-options reference describes the two standard sets: -Wall enables the warnings about constructions that are questionable to some users and easy to avoid or modify to prevent the warning, and it lists the flags it turns on — -Wunused, -Wuninitialized, -Wreorder, -Wreturn-type, -Wsign-compare, and more; -Wextra enables some extra warning flags that are not enabled by -Wall. A build without them compiles the same defects silently; with them, the same code reports the finding at the line that caused it.

## Bad

```cpp
int main() {
    int unused = 42; // hidden from a compiler without -Wall
    return 0;
}
```

## Good

```cpp
int main() {
    [[maybe_unused]] int configured = 42; // the intent is stated
    return 0;
}
```

## See Also

- [cpp-lint-werror](lint-werror.md) - making the remaining warnings stop the build
- [cpp-lint-pedantic](lint-pedantic.md) - the strict ISO set
