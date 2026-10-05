---
id: rust-anti-collect-intermediate
lang: rust
prefix: anti
title: "Don't collect intermediate iterators"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["collect", "intermediate", "don", "iterators"]
  files: ["**/*.rs"]
related: ["rust-perf-iter-lazy", "rust-perf-iter-over-index"]
sources:
  - title: "rust-skills: anti-collect-intermediate"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-collect-intermediate.md
---
> Don't collect intermediate iterators

## Why

Each `.collect()` allocates a new collection. Collecting intermediate results in a chain creates unnecessary allocations and prevents iterator fusion. Keep the chain lazy; collect only at the end.

## Bad

```rust
struct Item { value: i64, valid: bool }

impl Item {
    fn is_valid(&self) -> bool { self.valid }
}

// Three allocations, three passes
fn process(data: Vec<i32>) -> Vec<i32> {
    let step1: Vec<_> = data.into_iter().filter(|x| *x > 0).collect();
    let step2: Vec<_> = step1.into_iter().map(|x| x * 2).collect();
    step2.into_iter().filter(|x| *x < 100).collect()
}

// Collecting just to check length
fn has_valid_items(items: &[Item]) -> bool {
    let valid: Vec<_> = items.iter().filter(|i| i.is_valid()).collect();
    !valid.is_empty()
}

// Collecting to iterate again
fn sum_valid(items: &[Item]) -> i64 {
    let valid: Vec<_> = items.iter().filter(|i| i.is_valid()).collect();
    valid.iter().map(|i| i.value).sum()
}
```

## Good

```rust
struct Item { value: i64, valid: bool }

impl Item {
    fn is_valid(&self) -> bool { self.valid }
}

// Single allocation, single pass
fn process(data: Vec<i32>) -> Vec<i32> {
    data.into_iter()
        .filter(|x| *x > 0)
        .map(|x| x * 2)
        .filter(|x| *x < 100)
        .collect()
}

// No allocation - iterator short-circuits
fn has_valid_items(items: &[Item]) -> bool {
    items.iter().any(|i| i.is_valid())
}

// No intermediate allocation
fn sum_valid(items: &[Item]) -> i64 {
    items.iter().filter(|i| i.is_valid()).map(|i| i.value).sum()
}
```

## See Also

- [rust-perf-iter-lazy](perf-iter-lazy.md) - Lazy evaluation
- [rust-perf-iter-over-index](perf-iter-over-index.md) - Iterator patterns
