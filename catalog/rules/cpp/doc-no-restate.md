---
id: cpp-doc-no-restate
lang: cpp
prefix: doc
title: Do not restate in comments what the code already states
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [comments, redundancy, self-documenting]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-doc-why, cpp-doc-crisp]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> A comment that translates the next line into English adds nothing to maintain.

## Why

NL.1 is direct: do not say in comments what can be clearly stated in code. A line such as `return counter + 1;` already states the operation, so the comment duplicates it, slows the reader, and becomes one more thing to update when the code changes. P.1 adds the positive form of the same idea: express the intent in the code itself, and reserve comments for what the code cannot state.

## Bad

```cpp
// This function adds one to the counter and returns the new value.
int increment(int counter) {
    return counter + 1; // add one
}

int main() {
    return increment(0) == 1 ? 0 : 1;
}
```

## Good

```cpp
int increment(int counter) {
    return counter + 1;
}

int main() {
    return increment(0) == 1 ? 0 : 1;
}
```

## See Also

- [cpp-doc-why](doc-why.md) - what to write instead: the intent
- [cpp-doc-crisp](doc-crisp.md) - comments that survive the cut stay short
