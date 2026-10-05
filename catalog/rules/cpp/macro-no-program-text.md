---
id: cpp-macro-no-program-text
lang: cpp
prefix: macro
title: Never use macros to generate declarations or program text
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [define, code-generation, token-paste, declarations]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-macro-inline-function, cpp-macro-unique-prefix]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Replacing text macros
    url: https://en.cppreference.com/w/cpp/preprocessor/replace
---
> Generated names are invisible to debuggers, IDEs, and scope rules; write the code.

## Why

ES.30 is categorical: don't use macros for program text manipulation. A macro that expands into declarations creates entities that exist only after preprocessing — the debugger cannot step into them, the IDE cannot navigate to them, and the compiler's diagnostics point at the expansion, not the source. The preprocessor's own rules make it worse: `##` operands are not macro-expanded before pasting, and commas in template arguments split macro parameters. Where a shape repeats, a template or a function expresses it with full tooling support.

## Bad

```cpp
#define DECLARE_COUNTER(name) int name##_counter = 0

DECLARE_COUNTER(request); // generates a declaration

int main() {
    request_counter = 1;
    return request_counter == 1 ? 0 : 1;
}
```

## Good

```cpp
struct Counters {
    int request = 0; // an ordinary declaration
};

int main() {
    Counters counters;
    counters.request = 1;
    return counters.request == 1 ? 0 : 1;
}
```

## See Also

- [cpp-macro-inline-function](macro-inline-function.md) - text substitution reaching into expressions
- [cpp-macro-unique-prefix](macro-unique-prefix.md) - naming rules when macros are unavoidable
