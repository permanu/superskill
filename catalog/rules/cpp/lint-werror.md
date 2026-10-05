---
id: cpp-lint-werror
lang: cpp
prefix: lint
title: Treat warnings as errors in CI
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [werror, warnings, ci]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-lint-warnings-enabled, cpp-lint-diagnostic-pragmas]
sources:
  - title: GCC - Options to Request or Suppress Warnings
    url: https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html
  - title: GCC - Diagnostic Pragmas
    url: https://gcc.gnu.org/onlinedocs/gcc/Diagnostic-Pragmas.html
---
> -Werror turns every warning into a build failure before it becomes a bug.

## Why

The GCC warning-options reference states the option plainly: -Werror turns all warnings into errors. A warning that stays in a build is a known defect that nobody fixed; each new warning makes the existing ones harder to see, and the log stops being read. With -Werror the build stops at the first finding, and the diagnostic pragmas reference shows the sanctioned way to grant a specific exception — a scoped push/ignore/pop rather than a blanket policy of ignoring.

## Bad

```cpp
int classify(int value) {
    if (value > 0)
        return 1; // no return on the other path: a warning left in the build
}

int main() {
    return classify(1) == 1 ? 0 : 1;
}
```

## Good

```cpp
int classify(int value) {
    if (value > 0)
        return 1;
    return 0; // every path returns
}

int main() {
    return classify(1) == 1 ? 0 : 1;
}
```

## See Also

- [cpp-lint-warnings-enabled](lint-warnings-enabled.md) - the sets that produce the warnings
- [cpp-lint-diagnostic-pragmas](lint-diagnostic-pragmas.md) - the narrow way to make an exception
