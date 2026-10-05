---
id: cpp-tmpl-variadic-fold
lang: cpp
prefix: tmpl
title: Reduce parameter packs with fold expressions
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [variadic, parameter-pack, fold-expression]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [template]
related: [cpp-tmpl-generic-algorithm, cpp-macro-no-variadic-c]
sources:
  - title: cppreference - Fold expressions
    url: https://en.cppreference.com/w/cpp/language/fold
  - title: cppreference - Templates
    url: https://en.cppreference.com/w/cpp/language/templates
---
> A fold expression applies one operator across a pack without a recursive helper.

## Why

The fold reference defines the four forms — unary and binary folds to the left or right — that expand a pack over a binary operator, with the left fold `(... op pack)` becoming a chain of applications and the binary form carrying an init value. Manual recursion needs a base-case overload for the empty pack and a step overload that peels one argument at a time; the fold states the same reduction in one expression and handles the empty pack for `&&`, `||`, and the comma operator by definition.

## Bad

```cpp
int sum() { return 0; } // base case for the empty pack

template <class T, class... Rest>
int sum(T first, Rest... rest) { // manual recursion, one frame per argument
    return first + sum(rest...);
}

int main() {
    return sum(1, 2, 3) == 6 ? 0 : 1;
}
```

## Good

```cpp
template <class... Ts>
auto sum(Ts... values) {
    return (values + ...); // right fold over the pack
}

int main() {
    return sum(1, 2, 3) == 6 ? 0 : 1;
}
```

## See Also

- [cpp-tmpl-generic-algorithm](tmpl-generic-algorithm.md) - templates as families of functions
- [cpp-macro-no-variadic-c](macro-no-variadic-c.md) - variadic templates over C-style varargs
