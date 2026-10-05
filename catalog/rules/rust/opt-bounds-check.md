---
id: rust-opt-bounds-check
lang: rust
prefix: opt
title: "Use iterators and patterns that eliminate bounds checks in hot paths"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["bounds", "check", "iterators", "patterns", "eliminate", "checks", "hot", "paths"]
  files: ["**/*.rs"]
related: ["rust-opt-simd-portable", "rust-opt-cache-friendly", "rust-perf-profile-first"]
sources:
  - title: "rust-skills: opt-bounds-check"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/opt-bounds-check.md
---
> Use iterators and patterns that eliminate bounds checks in hot paths

## Why

Rust's safety guarantees require bounds checking on array/slice indexing. In tight loops, these checks can cause measurable overhead (branch mispredictions, preventing vectorization). Patterns like iterators, `get_unchecked`, and index splitting can eliminate these checks while maintaining safety.

## Bad

```rust
fn sum_products(a: &[f64], b: &[f64]) -> f64 {
    let mut sum = 0.0;
    for i in 0..a.len() {
        sum += a[i] * b[i];  // Two bounds checks per iteration
    }
    sum
}

fn apply_filter(data: &mut [u8], kernel: &[u8; 3]) {
    for i in 1..data.len() - 1 {
        // Three bounds checks per iteration
        data[i] = (data[i - 1] + data[i] + data[i + 1]) / 3;
    }
}
```

## Good

```rust
fn sum_products(a: &[f64], b: &[f64]) -> f64 {
    // Iterator zips - no bounds checks, vectorizes well
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

fn apply_filter(data: &mut [u8]) {
    // Windows pattern - no bounds checks
    for window in data.windows(3) {
        // window[0], window[1], window[2] are all valid
        let _ = window;
    }
    
    // Or use chunks
    for chunk in data.chunks_exact(4) {
        process_simd(chunk);
    }
}

fn process_simd(chunk: &[u8]) {
    let _ = chunk;
}
```

## See Also

- [rust-opt-simd-portable](opt-simd-portable.md) - SIMD requires unchecked access
- [rust-opt-cache-friendly](opt-cache-friendly.md) - Cache-efficient patterns
- [rust-perf-profile-first](perf-profile-first.md) - Identify actual hot paths
