---
id: rust-anti-index-over-iter
lang: rust
prefix: anti
title: "Don't use indexing when iterators work"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["index", "iter", "don", "indexing", "iterators", "work"]
  files: ["**/*.rs"]
related: ["rust-perf-iter-over-index", "rust-opt-bounds-check", "rust-perf-iter-lazy"]
sources:
  - title: "rust-skills: anti-index-over-iter"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-index-over-iter.md
---
> Don't use indexing when iterators work

## Why

Manual indexing (`for i in 0..len`) requires bounds checks on every access, prevents SIMD optimization, and introduces off-by-one error risks. Iterators eliminate these issues and are more idiomatic Rust.

## Bad

```rust
// Manual indexing - bounds checked every access
fn sum_squares(data: &[i32]) -> i64 {
    let mut result = 0i64;
    for i in 0..data.len() {
        result += (data[i] as i64) * (data[i] as i64);
    }
    result
}

// Index-based with multiple arrays
fn dot_product(a: &[f64], b: &[f64]) -> f64 {
    let mut sum = 0.0;
    for i in 0..a.len().min(b.len()) {
        sum += a[i] * b[i];
    }
    sum
}

// Mutation with indices
fn normalize(data: &mut [f64]) {
    let max = data.iter().cloned().fold(0.0, f64::max);
    for i in 0..data.len() {
        data[i] /= max;
    }
}
```

## Good

```rust
// Iterator - no bounds checks, SIMD-friendly
fn sum_squares(data: &[i32]) -> i64 {
    data.iter()
        .map(|&x| (x as i64) * (x as i64))
        .sum()
}

// Zip - handles length mismatch automatically
fn dot_product(a: &[f64], b: &[f64]) -> f64 {
    a.iter()
        .zip(b.iter())
        .map(|(&x, &y)| x * y)
        .sum()
}

// Mutable iteration
fn normalize(data: &mut [f64]) {
    let max = data.iter().cloned().fold(0.0, f64::max);
    for x in data.iter_mut() {
        *x /= max;
    }
}
```

## See Also

- [rust-perf-iter-over-index](perf-iter-over-index.md) - Performance details
- [rust-opt-bounds-check](opt-bounds-check.md) - Bounds check elimination
- [rust-perf-iter-lazy](perf-iter-lazy.md) - Lazy iterators
