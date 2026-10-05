---
id: cpp-style-name-length
lang: cpp
prefix: style
title: Scale name length with scope
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, scope, readability]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-style-consistent-naming, cpp-init-declare-at-use]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Identifiers
    url: https://en.cppreference.com/w/cpp/language/identifiers
---
> A name read at a distance must carry its context; a local one need not.

## Why

NL.7 asks to make the length of a name roughly proportional to the length of its scope. The identifiers reference notes that identifiers are arbitrarily long and every character is significant — the language puts no limit, so the convention is the only thing deciding how much context a name carries. A global with a one-letter name forces readers to hunt for its meaning; a loop variable with a sentence for a name forces them to read it every iteration. The scope tells the author how much explanation the name must contain.

## Bad

```cpp
int n = 0; // global state with a one-letter name

int main() {
    int number_of_processed_records_in_this_run = 3; // a paragraph for a local
    n = number_of_processed_records_in_this_run;
    return n == 3 ? 0 : 1;
}
```

## Good

```cpp
int processed_records = 0; // global: spelled out

int main() {
    int local = 3; // local: short is enough
    processed_records = local;
    return processed_records == 3 ? 0 : 1;
}
```

## See Also

- [cpp-style-consistent-naming](style-consistent-naming.md) - the convention the length follows
- [cpp-init-declare-at-use](init-declare-at-use.md) - keeping scopes small
