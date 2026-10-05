---
id: cpp-macro-undef-helper
lang: cpp
prefix: macro
title: Undefine helper macros when the region that needs them ends
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [undef, macros, hygiene, leakage]
  files: ["**/*.hpp", "**/*.h"]
  symbols: []
related: [cpp-macro-unique-prefix, cpp-macro-all-caps]
sources:
  - title: cppreference - Replacing text macros
    url: https://en.cppreference.com/w/cpp/preprocessor/replace
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> #undef cancels the definition; a helper left defined becomes every includer's problem.

## Why

The preprocessor reference documents `#undef` as cancelling a previous definition, ignored when the name is not defined. A helper macro that is not undefined leaks into every file that includes the header: it can collide with a later definition — redefining a macro with a different body is ill-formed — or with reserved names, and it appears in the includer's completion lists as noise. The define, use, and undef sequence keeps the macro's lifetime bounded to the region that needs it.

## Bad

```cpp
#define CHECK(x) ((void)(x)) // helper left defined for all includers

int main() {
    CHECK(1);
    return 0;
}
```

## Good

```cpp
#define CHECK(x) ((void)(x))

void run() {
    CHECK(1);
}

#undef CHECK // the helper does not leak past this point

int main() {
    run();
    return 0;
}
```

## See Also

- [cpp-macro-unique-prefix](macro-unique-prefix.md) - limiting the damage while it is defined
- [cpp-macro-all-caps](macro-all-caps.md) - the naming convention for the ones that remain
