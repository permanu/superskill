---
id: rust-perf-iter-lazy
lang: rust
prefix: perf
title: "Keep iterators lazy, collect only when needed"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["iter", "lazy", "keep", "iterators", "collect"]
  files: ["**/*.rs"]
related: ["rust-perf-iter-over-index", "rust-anti-collect-intermediate"]
sources:
  - title: "rust-skills: perf-iter-lazy"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/perf-iter-lazy.md
---
> Keep iterators lazy, collect only when needed

## Why

Rust iterators are lazy—they compute values on demand. This enables single-pass processing, avoids intermediate allocations, and allows short-circuiting. Calling `.collect()` too early forces evaluation and allocates unnecessarily.

## Bad

```rust
// Collects intermediate results unnecessarily
fn process(data: Vec<i32>) -> Vec<i32> {
    let filtered: Vec<_> = data.into_iter()
        .filter(|x| *x > 0)
        .collect();  // Unnecessary allocation
    
    let mapped: Vec<_> = filtered.into_iter()
        .map(|x| x * 2)
        .collect();  // Another unnecessary allocation
    
    mapped.into_iter()
        .take(10)
        .collect()
}

// Collects before checking existence
fn has_positive(data: &[i32]) -> bool {
    let positives: Vec<_> = data.iter()
        .filter(|&&x| x > 0)
        .collect();  // Allocates entire filtered result
    
    !positives.is_empty()
}
```

## Good

```rust
// Single chain, single collect
fn process(data: Vec<i32>) -> Vec<i32> {
    data.into_iter()
        .filter(|x| *x > 0)
        .map(|x| x * 2)
        .take(10)
        .collect()
}

// Short-circuits on first match
fn has_positive(data: &[i32]) -> bool {
    data.iter().any(|&x| x > 0)
}
```

## See Also

- [rust-perf-iter-over-index](perf-iter-over-index.md) - Prefer iterators
- [rust-anti-collect-intermediate](anti-collect-intermediate.md) - Anti-pattern
