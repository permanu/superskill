---
id: cpp-lint-diagnostic-pragmas
lang: cpp
prefix: lint
title: Suppress diagnostics in the smallest scope
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pragmas, suppression, diagnostics]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-lint-werror, cpp-lint-warnings-enabled]
sources:
  - title: GCC - Diagnostic Pragmas
    url: https://gcc.gnu.org/onlinedocs/gcc/Diagnostic-Pragmas.html
  - title: GCC - Options to Request or Suppress Warnings
    url: https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html
---
> push and pop bracket an exception; a bare ignore lasts to the end of the file.

## Why

The diagnostic-pragmas reference defines the scoped form: push remembers the state of the diagnostics and pop restores it, while a pop with no matching push restores the command-line options — and its example ignores one warning for exactly one call. It also notes that these pragmas override any command-line options, which is why the scope matters: an unscoped ignore silences the warning for every line that follows, including the new code the warning was meant to protect.

## Bad

```cpp
#pragma GCC diagnostic ignored "-Wunused-variable" // silences the whole file

int main() {
    int unused = 42;
    return 0;
}
```

## Good

```cpp
int main() {
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-variable"
    int unused = 42; // deliberately unused in this build
#pragma GCC diagnostic pop
    return 0;
}
```

## See Also

- [cpp-lint-werror](lint-werror.md) - the policy the exception is carved out of
- [cpp-lint-warnings-enabled](lint-warnings-enabled.md) - the warnings being scoped
