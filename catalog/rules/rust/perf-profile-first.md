---
id: rust-perf-profile-first
lang: rust
prefix: perf
title: "Profile before optimizing"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["profile", "first", "optimizing"]
  files: ["**/*.rs"]
related: ["rust-opt-lto-release", "rust-test-criterion-bench", "rust-anti-premature-optimize"]
sources:
  - title: "rust-skills: perf-profile-first"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/perf-profile-first.md
---
> Profile before optimizing

## Why

Performance intuition is unreliable. The code you think is slow frequently isn't, while actual bottlenecks hide in unexpected places. Profiling shows you exactly where time is spent, preventing wasted effort on optimizations that don't matter.

## Bad

```rust
#[derive(Clone)]
struct Item;
struct Output;

fn expensive_computation(item: &Item) -> Output {
    let _ = item;
    Output
}

// Optimizing without measuring
fn process(data: &[Item]) -> Vec<Output> {
    // Guess: the clone is the slow part
    let cloned: Vec<_> = data.iter().cloned().collect();

    // Actually, 99% of time is spent here:
    cloned.iter().map(|x| expensive_computation(x)).collect()
}

// Over-engineering rarely-called code
#[inline(always)]
fn rarely_called() {
    // This runs once at startup
}
```

## Good

```rust
use rayon::prelude::*;

#[derive(Clone)]
struct Item;
struct Output;

fn expensive_computation(item: &Item) -> Output {
    let _ = item;
    Output
}

// 1. Profile: cargo flamegraph --bin myapp
// 2. Flamegraph shows expensive_computation takes 95% of time
// 3. Optimize the hot spot
fn process(data: &[Item]) -> Vec<Output> {
    // Clone is fine - only 1% of time
    let cloned: Vec<_> = data.iter().cloned().collect();

    // Focus optimization HERE
    cloned.par_iter()
        .map(|x| expensive_computation(x))
        .collect()
}
```

## See Also

- [rust-opt-lto-release](opt-lto-release.md) - Enable LTO for release builds
- [rust-test-criterion-bench](test-criterion-bench.md) - Use criterion for benchmarking
- [rust-anti-premature-optimize](anti-premature-optimize.md) - Don't optimize without data
