---
id: rust-test-criterion-bench
lang: rust
prefix: test
title: "Use `criterion` for benchmarking"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["criterion", "bench", "benchmarking"]
  files: ["**/*.rs"]
  symbols: ["criterion"]
related: ["rust-perf-profile-first", "rust-perf-black-box-bench"]
sources:
  - title: "rust-skills: test-criterion-bench"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-criterion-bench.md
  - title: "github.com/tokio-rs/tokio/blob/master/benches/sync_mpsc.rs"
    url: https://github.com/tokio-rs/tokio/blob/master/benches/sync_mpsc.rs
---
> Use `criterion` for benchmarking

## Why

Criterion provides statistically rigorous benchmarking with warmup, multiple iterations, outlier detection, and comparison between runs. It's far more reliable than simple timing with `Instant::now()`.

## Bad

```rust
use std::time::Instant;

fn main() {
    // One run, no warm-up, no black_box: noise dominates.
    let start = Instant::now();
    let sum: u64 = (0..1_000_000u64).sum();
    println!("took {:?} (sum={})", start.elapsed(), sum);
}
```

## Good

```rust
// benches/my_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn bench_fibonacci(c: &mut Criterion) {
    c.bench_function("fib 20", |b| {
        b.iter(|| fibonacci(black_box(20)))
    });
}

criterion_group!(benches, bench_fibonacci);
criterion_main!(benches);
```

## See Also

- [rust-perf-profile-first](perf-profile-first.md) - Profile before optimizing
- [rust-perf-black-box-bench](perf-black-box-bench.md) - Use black_box in benchmarks
