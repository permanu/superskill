---
id: cpp-style-switch-over-if
lang: cpp
prefix: style
title: Use switch when choosing among values
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [switch, if, choices]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [switch]
related: [cpp-anti-fallthrough, cpp-style-one-declaration]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - switch statement
    url: https://en.cppreference.com/w/cpp/language/switch
---
> A chain of equality tests on one value is a switch the compiler can check.

## Why

ES.70 asks to prefer a switch-statement to an if-statement when there is a choice. The switch reference describes the form: it transfers control to one of several statements depending on the value of a condition, with case labels for the constants and an optional default for everything else. The if-chain hides the shared subject and repeats it per branch; the switch states it once, gives the compiler the full set of cases to diagnose (duplicates, missing enumerators), and keeps the fallthrough rules explicit.

## Bad

```cpp
int width(int mode) {
    if (mode == 0)
        return 1;
    if (mode == 1)
        return 2;
    if (mode == 2)
        return 4;
    return 8;
}

int main() {
    return width(1) == 2 ? 0 : 1;
}
```

## Good

```cpp
int width(int mode) {
    switch (mode) { // one value, several choices
        case 0:
            return 1;
        case 1:
            return 2;
        case 2:
            return 4;
        default:
            return 8;
    }
}

int main() {
    return width(1) == 2 ? 0 : 1;
}
```

## See Also

- [cpp-anti-fallthrough](anti-fallthrough.md) - stating intentional fallthrough
- [cpp-style-one-declaration](style-one-declaration.md) - one name per declaration
