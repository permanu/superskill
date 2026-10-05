---
id: cpp-doc-why
lang: cpp
prefix: doc
title: Comments state intent, not the mechanics the code already shows
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [comments, intent, rationale]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-doc-no-restate, cpp-doc-crisp]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Say why the code does this; the code already says what it does.

## Why

NL.2 asks that comments state intent: the reader can see the operations, but not the reason they are the right ones, so the comment's job is the purpose, the constraint, or the assumption behind them. A comment that narrates the mechanism repeats what the next line already says and goes stale the moment the mechanism changes. Intent comments survive refactoring because they describe a goal, not a sequence.

## Bad

```cpp
#include <cstddef>

std::size_t bucket_count_for(std::size_t elements) {
    std::size_t count = 1;
    while (count < elements)
        count <<= 1; // shift left until count >= elements
    return count;
}

int main() {
    return bucket_count_for(3) == 4 ? 0 : 1;
}
```

## Good

```cpp
#include <cstddef>

std::size_t bucket_count_for(std::size_t elements) {
    std::size_t count = 1;
    while (count < elements)
        count <<= 1; // hash tables index fastest with a power-of-two bucket count
    return count;
}

int main() {
    return bucket_count_for(3) == 4 ? 0 : 1;
}
```

## See Also

- [cpp-doc-no-restate](doc-no-restate.md) - the companion rule against repeating code
- [cpp-doc-crisp](doc-crisp.md) - keeping the intent statement short
