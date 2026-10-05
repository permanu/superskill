---
id: cpp-unsafe-unsequenced
lang: cpp
prefix: unsafe
title: Do not modify one scalar twice without sequencing
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unsequenced, sequence, side-effects, evaluation-order]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-unsafe-uninitialized-read, cpp-unsafe-no-deref-invalid]
sources:
  - title: cppreference - Order of evaluation
    url: https://en.cppreference.com/w/cpp/language/eval_order
  - title: cppreference - Undefined behavior
    url: https://en.cppreference.com/w/cpp/language/ub
---
> Two unsequenced writes to one object are undefined behavior.

## Why

The order-of-evaluation reference lists the undefined cases directly: `i = ++i + i++;` and `n = ++i + i;` are undefined because a side effect on a memory location is unsequenced relative to another side effect, or relative to a value computation using that location. Since C++17 some forms were repaired — `i = i++ + 2` is now well-defined and function arguments are indeterminately sequenced — but the unsequenced cases remain, and the UB reference counts them among the examples that make a program meaningless. Give each modification its own statement.

## Bad

```cpp
int main() {
    int i = 0;
    i = ++i + i++; // two unsequenced modifications of i: undefined
    return i;
}
```

## Good

```cpp
int main() {
    int i = 0;
    ++i;       // first modification
    i = i + 1; // then the read and the write, sequenced
    return i;
}
```

## See Also

- [cpp-unsafe-uninitialized-read](unsafe-uninitialized-read.md) - the other "value not in a known state" defect
- [cpp-unsafe-no-deref-invalid](unsafe-no-deref-invalid.md) - the other everyday undefined behavior
