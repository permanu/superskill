---
id: rust-opt-pgo-profile
lang: rust
prefix: opt
title: "Use Profile-Guided Optimization (PGO) for maximum performance"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["pgo", "profile", "profile-guided", "optimization", "maximum", "performance"]
  files: ["**/*.rs"]
related: ["rust-opt-lto-release", "rust-opt-codegen-units", "rust-perf-profile-first"]
sources:
  - title: "rust-skills: opt-pgo-profile"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/opt-pgo-profile.md
---
> Use Profile-Guided Optimization (PGO) for maximum performance

## Why

PGO uses real runtime behavior to guide compiler optimization decisions. By profiling actual workloads, the compiler learns which code paths are hot, optimizing them aggressively while deprioritizing cold paths. This can yield 10-30% performance improvements beyond standard optimizations.

## Bad

```rust
// Guessing at hot paths instead of training on a real workload.
#![allow(dead_code)]

fn hot_path(x: u64) -> u64 {
    x.wrapping_mul(31)
}

fn main() {
    // No profile data: the build optimizes by intuition.
    println!("{}", hot_path(7));
}
```

## Good

```rust
// # Step 1: Build instrumented binary
// RUSTFLAGS="-Cprofile-generate=/tmp/pgo-data" \
//     cargo build --release

// # Step 2: Run representative workloads
// ./target/release/my_app < test_data_1.txt
// ./target/release/my_app < test_data_2.txt
// ./target/release/my_app < typical_workload.txt

// # Step 3: Merge profile data
// llvm-profdata merge -o /tmp/pgo-data/merged.profdata /tmp/pgo-data

// # Step 4: Build optimized binary using profile
// RUSTFLAGS="-Cprofile-use=/tmp/pgo-data/merged.profdata" \
//     cargo build --release
```

## See Also

- [rust-opt-lto-release](opt-lto-release.md) - LTO works well with PGO
- [rust-opt-codegen-units](opt-codegen-units.md) - Single codegen unit for PGO
- [rust-perf-profile-first](perf-profile-first.md) - Profiling basics
