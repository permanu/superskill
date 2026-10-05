---
id: cpp-macro-all-caps
lang: cpp
prefix: macro
title: Reserve ALL_CAPS names for macros
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, macros, all-caps, convention]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-macro-constexpr, cpp-macro-unique-prefix]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> ALL_CAPS tells the reader the name is text substitution, not a variable.

## Why

ES.32 asks that all macro names use `ALL_CAPS`, and NL.9 adds the converse: use ALL_CAPS for macro names only. The convention exists because a macro is not an ordinary name — it is replaced before the compiler ever sees it, it ignores scope, and it leaves no symbol for a debugger to find. Marking it in capitals tells the reader to look for the definition and expect substitution; keeping ordinary names in other styles keeps macros visible and collisions rarer.

## Bad

```cpp
#define buffer_size 256 // looks like a variable

int main() {
    return buffer_size == 256 ? 0 : 1;
}
```

## Good

```cpp
#define BUFFER_SIZE 256 // ALL_CAPS marks it as a macro

int main() {
    return BUFFER_SIZE == 256 ? 0 : 1;
}
```

## See Also

- [cpp-macro-constexpr](macro-constexpr.md) - the better home for constants
- [cpp-macro-unique-prefix](macro-unique-prefix.md) - making the name collision-proof as well
