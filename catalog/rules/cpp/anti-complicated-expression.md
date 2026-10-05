---
id: cpp-anti-complicated-expression
lang: cpp
prefix: anti
title: Split complicated expressions into named steps
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [expressions, readability, evaluation-order]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-anti-fallthrough, cpp-num-avoid-overflow]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Order of evaluation
    url: https://en.cppreference.com/w/cpp/language/eval_order
---
> A dense expression hides both its precedence and its evaluation order.

## Why

ES.40 asks to avoid complicated expressions. The order-of-evaluation reference adds the other half of the problem: the order of evaluation of any part of an expression is unspecified except where the rules say otherwise, so a dense expression combines precedence the reader must decode with an order the standard does not fix. Named intermediate values state each step once, give the parts names, and pin the order to the statements.

## Bad

```cpp
int main() {
    const int a = 3;
    const int b = 5;
    const int c = 7;
    const int result = a + b * c % 8 << 2; // precedence puzzle
    return result == 24 ? 0 : 1;
}
```

## Good

```cpp
int main() {
    const int a = 3;
    const int b = 5;
    const int c = 7;
    const int scaled = (b * c) % 8; // named steps
    const int shifted = (a + scaled) << 2;
    return shifted == 24 ? 0 : 1;
}
```

## See Also

- [cpp-anti-fallthrough](anti-fallthrough.md) - the control-flow version of hidden intent
- [cpp-num-avoid-overflow](num-avoid-overflow.md) - arithmetic steps that also need checking
