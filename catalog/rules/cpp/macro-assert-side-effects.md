---
id: cpp-macro-assert-side-effects
lang: cpp
prefix: macro
title: Put no side effects inside assert
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [assert, ndebug, side-effects, release]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [assert, NDEBUG]
related: [cpp-macro-no-side-effects, cpp-test-error-paths]
sources:
  - title: cppreference - assert
    url: https://en.cppreference.com/w/cpp/error/assert
  - title: cppreference - Replacing text macros
    url: https://en.cppreference.com/w/cpp/preprocessor/replace
---
> When NDEBUG is defined, assert does nothing — including not evaluating its argument.

## Why

The assert reference is explicit: if `NDEBUG` is defined where `<cassert>` is included, the assertion is disabled and `assert` does nothing; otherwise it evaluates its argument and aborts on failure. Any side effect written inside the argument therefore happens in debug builds and silently disappears in release builds, so the two configurations run different programs. The work belongs before the assert; the assert receives only the condition to check.

## Bad

```cpp
#include <cassert>

int main() {
    int attempts = 0;
    assert(++attempts == 1); // not evaluated when NDEBUG is defined
    return attempts == 1 ? 0 : 1;
}
```

## Good

```cpp
#include <cassert>

int main() {
    int attempts = 0;
    ++attempts; // the work happens unconditionally
    assert(attempts == 1); // the check may vanish
    return attempts == 1 ? 0 : 1;
}
```

## See Also

- [cpp-macro-no-side-effects](macro-no-side-effects.md) - the general evaluation-count rule
- [cpp-test-error-paths](test-error-paths.md) - testing the paths release builds take
