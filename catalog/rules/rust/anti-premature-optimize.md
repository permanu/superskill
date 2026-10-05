---
id: rust-anti-premature-optimize
lang: rust
prefix: anti
title: "Don't optimize before profiling"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["premature", "optimize", "don", "profiling"]
  files: ["**/*.rs"]
related: ["rust-perf-profile-first", "rust-test-criterion-bench", "rust-opt-inline-small"]
sources:
  - title: "rust-skills: anti-premature-optimize"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-premature-optimize.md
---
> Don't optimize before profiling

## Why

Premature optimization wastes time, complicates code, and targets the wrong bottlenecks. Most code isn't performance-critical; the hot 10% matters. Profile first, then optimize the actual bottlenecks with data-driven decisions.

## Bad

```rust
struct Result;

// "Optimizing" without measurement
fn sum(data: &[i32]) -> i32 {
    // Using unsafe "for performance" without profiling
    unsafe {
        let mut sum = 0;
        for i in 0..data.len() {
            sum += *data.get_unchecked(i);
        }
        sum
    }
}

// Hand-rolled data structures "for speed"
struct MyVec<T> {
    ptr: *mut T,
    len: usize,
    cap: usize,
}
```

## Good

```rust
use std::collections::HashMap;

struct Result;

// Simple, idiomatic - let the compiler optimize
fn sum(data: &[i32]) -> i32 {
    data.iter().sum()
}

// Profile, then optimize only the measured bottleneck
fn sum_optimized(data: &[i32]) -> i32 {
    // After profiling showed 3x headroom, a SIMD path can follow;
    // until then the iterator version is the baseline.
    data.iter().sum()
}

fn main() {
    // Standard library types are well optimized
    let _cache: HashMap<String, Result> = HashMap::new();
}
```

## See Also

- [rust-perf-profile-first](perf-profile-first.md) - Profile before optimize
- [rust-test-criterion-bench](test-criterion-bench.md) - Benchmarking
- [rust-opt-inline-small](opt-inline-small.md) - Inline guidelines
