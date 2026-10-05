---
id: cpp-doc-comment-out
lang: cpp
prefix: doc
title: Disable code with #if 0 or line comments, never a block comment
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [comments, nesting, dead-code, preprocessor]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-doc-no-restate, cpp-doc-crisp]
sources:
  - title: cppreference - Comments
    url: https://en.cppreference.com/w/cpp/comment
  - title: cppreference - #if directive
    url: https://en.cppreference.com/w/cpp/preprocessor/conditional
---
> Block comments do not nest; one inner */ ends the comment early and the rest compiles.

## Why

A C-style comment runs until the first `*/`, so wrapping code that itself contains a `/* ... */` comment in another one silently terminates the outer comment at the inner terminator, leaving the remainder of the text as compiled code. The language reference states plainly that C-style comments cannot be nested and lists `#if 0` as a supported exclusion mechanism. Line comments and `#if 0` nest safely, so disabling a block never changes what the compiler sees beyond the excluded region.

## Bad

```cpp
/*
int legacy_round(double value) { return static_cast<int>(value + 0.5); }
*/

int main() {
    return 0;
}
```

## Good

```cpp
#if 0
int legacy_round(double value) { return static_cast<int>(value + 0.5); }
#endif

int main() {
    return 0;
}
```

## See Also

- [cpp-doc-no-restate](doc-no-restate.md) - the related rule about dead comments
- [cpp-doc-crisp](doc-crisp.md) - keeping whatever remains short
