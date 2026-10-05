---
id: cpp-trait-requires-expression
lang: cpp
prefix: trait
title: Write ad-hoc requirements as requires-expressions
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [requires-expression, constraints, operations]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [requires]
related: [cpp-trait-constrain-templates, cpp-trait-minimal-requirements]
sources:
  - title: cppreference - requires expression
    url: https://en.cppreference.com/w/cpp/language/requires
  - title: cppreference - Constraints and concepts
    url: https://en.cppreference.com/w/cpp/language/constraints
---
> A requires-expression states which expressions must be valid, in the interface.

## Why

The requires reference defines the expression: it yields a bool that describes constraints, with simple requirements asserting an expression is valid, type requirements asserting a nested type exists, compound requirements asserting properties of a result, and nested requirements adding further constraints. Requirements written in the template body surface as instantiation errors after the fact; the same operations listed in a requires-expression are checked as part of overload resolution, and an unsatisfied constraint removes the candidate instead of breaking the build.

## Bad

```cpp
template <class T>
void reset(T& value) { value.clear(); } // the requirement lives in the body

int main() {
    return 0;
}
```

## Good

```cpp
template <class T>
    requires requires(T& value) { value.clear(); } // operations stated up front
void reset(T& value) { value.clear(); }

int main() {
    return 0;
}
```

## See Also

- [cpp-trait-constrain-templates](trait-constrain-templates.md) - named constraints on templates
- [cpp-trait-minimal-requirements](trait-minimal-requirements.md) - listing only the operations used
