---
id: cpp-lint-clang-tidy
lang: cpp
prefix: lint
title: Run clang-tidy with the guideline checks
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [clang-tidy, static-analysis, checks]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-lint-static-analyzer, cpp-lint-werror]
sources:
  - title: clang-tidy - Checks
    url: https://clang.llvm.org/extra/clang-tidy/
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> clang-tidy's check families encode the guidelines the compiler does not.

## Why

The clang-tidy documentation lists its check families: bugprone-*, cppcoreguidelines-*, modernize-*, performance-*, readability-*, and more — the cppcoreguidelines-* group maps directly to the Core Guidelines this pack draws from, and bugprone-* catches defects the compiler's own warnings do not. Warnings cover what the front end can see cheaply; the linter covers the semantic and stylistic patterns across a translation unit, and its output names the check that fired so the fix is explicit.

## Bad

```cpp
#include <string>

void log(std::string message) { // a copy per call for read-only use
    (void)message;
}

int main() {
    log("started");
    return 0;
}
```

## Good

```cpp
#include <string>
#include <string_view>

void log(std::string_view message) { // the parameter states read-only use
    (void)message;
}

int main() {
    log("started");
    return 0;
}
```

## See Also

- [cpp-lint-static-analyzer](lint-static-analyzer.md) - the deeper path analysis
- [cpp-lint-werror](lint-werror.md) - the compiler-level baseline
