---
id: cpp-anti-c-style-cast
lang: cpp
prefix: anti
title: Use named casts, never C-style casts
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [c-style-cast, static-cast, conversions]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [static_cast]
related: [cpp-sec-no-type-punning, cpp-unsafe-invalid-downcast]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Explicit type conversion
    url: https://en.cppreference.com/w/cpp/language/explicit_cast
---
> A C-style cast tries five different casts in order and takes the first that works.

## Why

ES.48 asks to avoid casts, and ES.49 that if you must use one, use a named cast. The explicit-conversion reference shows what the C-style form hides: the compiler interprets it as const_cast, then static_cast with extensions, then static_cast followed by const_cast, then reinterpret_cast, then reinterpret_cast followed by const_cast — and the first choice that satisfies the cast operator is selected, even if it is ill-formed. The named forms say which conversion is meant and fail when it cannot do exactly that.

## Bad

```cpp
int main() {
    double ratio = 3.7;
    int count = (int)ratio; // which of the five casts is this?
    return count == 3 ? 0 : 1;
}
```

## Good

```cpp
int main() {
    double ratio = 3.7;
    int count = static_cast<int>(ratio); // the intent is named
    return count == 3 ? 0 : 1;
}
```

## See Also

- [cpp-sec-no-type-punning](sec-no-type-punning.md) - the reinterpret_cast hazards in the chain
- [cpp-unsafe-invalid-downcast](unsafe-invalid-downcast.md) - the static_cast form that still needs a check
