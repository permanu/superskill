---
id: rust-perf-black-box-bench
lang: rust
prefix: perf
title: "Use black_box in benchmarks"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["black", "box", "bench", "black_box", "benchmarks"]
  files: ["**/*.rs"]
related: ["rust-test-criterion-bench", "rust-perf-profile-first", "rust-perf-release-profile"]
sources:
  - title: "rust-skills: perf-black-box-bench"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/perf-black-box-bench.md
---
> Use black_box in benchmarks

## Why

The compiler aggressively optimizes code, potentially eliminating computations whose results aren't used. In benchmarks, this can lead to measuring nothing instead of the actual code. `std::hint::black_box()` prevents the compiler from optimizing away values, ensuring accurate measurements.

## Bad

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn expensive_computation(input: i32) -> i32 {
    input * input
}

fn benchmark_bad(c: &mut Criterion) {
    c.bench_function("compute", |b| {
        b.iter(|| {
            let result = expensive_computation(42);
            // Result unused - compiler may eliminate the call!
        });
    });
}

fn benchmark_also_bad(c: &mut Criterion) {
    let input = 42;  // Constant - compiler may precompute
    
    c.bench_function("compute", |b| {
        b.iter(|| {
            expensive_computation(input)
            // Return value may still be optimized away
        });
    });
}
```

## Good

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn expensive_computation(input: i32) -> i32 {
    input * input
}

fn benchmark_good(c: &mut Criterion) {
    c.bench_function("compute", |b| {
        b.iter(|| {
            // black_box on input prevents constant folding
            let result = expensive_computation(black_box(42));
            // black_box on output prevents dead code elimination
            black_box(result)
        });
    });
}

// Or simpler with Criterion's built-in support
fn benchmark_simpler(c: &mut Criterion) {
    c.bench_function("compute", |b| {
        b.iter(|| expensive_computation(black_box(42)))
    });
}
```

## See Also

- [rust-test-criterion-bench](test-criterion-bench.md) - Using Criterion
- [rust-perf-profile-first](perf-profile-first.md) - Profile before optimize
- [rust-perf-release-profile](perf-release-profile.md) - Release settings
