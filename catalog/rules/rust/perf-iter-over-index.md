---
id: rust-perf-iter-over-index
lang: rust
prefix: perf
title: "Prefer iterators over manual indexing"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["iter", "index", "iterators", "manual", "indexing"]
  files: ["**/*.rs"]
related: ["rust-perf-iter-lazy", "rust-opt-bounds-check", "rust-anti-index-over-iter", "rust-conc-rayon-par-iter"]
sources:
  - title: "rust-skills: perf-iter-over-index"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/perf-iter-over-index.md
---
> Prefer iterators over manual indexing

## Why

Iterators are the idiomatic way to traverse collections in Rust. They enable bounds check elimination, SIMD auto-vectorization, and cleaner code. Manual indexing (`for i in 0..len`) blocks these optimizations and introduces off-by-one error risks.

## Bad

```rust
// Manual indexing - bounds checked every iteration
fn sum_squares(data: &[i32]) -> i64 {
    let mut sum = 0i64;
    for i in 0..data.len() {
        sum += (data[i] as i64) * (data[i] as i64);
    }
    sum
}

// Index-based iteration with multiple collections
fn dot_product(a: &[f64], b: &[f64]) -> f64 {
    let mut sum = 0.0;
    for i in 0..a.len().min(b.len()) {
        sum += a[i] * b[i];
    }
    sum
}

// Mutating with indices
fn double_values(data: &mut [i32]) {
    for i in 0..data.len() {
        data[i] *= 2;
    }
}
```

## Good

```rust
// Iterator - bounds checks eliminated, SIMD-friendly
fn sum_squares(data: &[i32]) -> i64 {
    data.iter()
        .map(|&x| (x as i64) * (x as i64))
        .sum()
}

// Zip iterators - no manual length handling
fn dot_product(a: &[f64], b: &[f64]) -> f64 {
    a.iter()
        .zip(b.iter())
        .map(|(&x, &y)| x * y)
        .sum()
}

// Mutable iteration
fn double_values(data: &mut [i32]) {
    for x in data.iter_mut() {
        *x *= 2;
    }
}
```

## See Also

- [rust-perf-iter-lazy](perf-iter-lazy.md) - Keep iterators lazy
- [rust-opt-bounds-check](opt-bounds-check.md) - Bounds check elimination
- [rust-anti-index-over-iter](anti-index-over-iter.md) - Anti-pattern
- [rust-conc-rayon-par-iter](conc-rayon-par-iter.md) - Parallelize data-parallel loops
