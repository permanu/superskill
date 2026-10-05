---
id: rust-conc-rayon-par-iter
lang: rust
prefix: conc
title: "Use rayon's `par_iter()` for CPU-bound data parallelism"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["rayon", "par", "iter", "par_iter", "cpu-bound", "data", "parallelism"]
  files: ["**/*.rs"]
  symbols: ["par_iter"]
related: ["rust-conc-scoped-threads", "rust-perf-iter-over-index", "rust-async-spawn-blocking"]
sources:
  - title: "rust-skills: conc-rayon-par-iter"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/conc-rayon-par-iter.md
---
> Use rayon's `par_iter()` for CPU-bound data parallelism

## Why

Rayon's work-stealing scheduler parallelizes data-parallel workloads with an API nearly identical to standard iterators — changing `.iter()` to `.par_iter()` can yield near-linear speedup across cores. It automatically balances load across threads, handles chunking, and composes with the full iterator adapter chain. For IO-bound concurrency, use async instead; rayon is strictly for CPU-bound computation.

## Bad

```rust
// single-threaded — wastes available cores on a CPU-bound workload
fn sum_squares(data: &[f64]) -> f64 {
    data.iter().map(|x| x * x).sum()
}

fn normalize(data: &mut [f64]) {
    let max = data.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    data.iter_mut().for_each(|x| *x /= max);
}
```

## Good

```rust
use rayon::prelude::*;

fn sum_squares(data: &[f64]) -> f64 {
    data.par_iter().map(|x| x * x).sum()
}

fn normalize(data: &mut [f64]) {
    let max = data.par_iter().cloned().reduce(|| f64::NEG_INFINITY, f64::max);
    data.par_iter_mut().for_each(|x| *x /= max);
}

fn keep_positive(data: &[f64]) -> Vec<f64> {
    data.par_iter().copied().filter(|&x| x > 0.0).collect()
}

fn sort_large(data: &mut [f64]) {
    // parallel unstable sort — faster than std sort for large slices
    data.par_sort_unstable_by(|a, b| a.partial_cmp(b).unwrap());
}
```

## See Also

- [rust-conc-scoped-threads](conc-scoped-threads.md) - Borrow stack data across short-lived threads
- [rust-perf-iter-over-index](perf-iter-over-index.md) - Prefer iterators over manual indexing
- [rust-async-spawn-blocking](async-spawn-blocking.md) - offload CPU work from async runtimes
