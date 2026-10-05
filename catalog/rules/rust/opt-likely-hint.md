---
id: rust-opt-likely-hint
lang: rust
prefix: opt
title: "Use code structure to hint at likely branches; use intrinsics on nightly"
severity: prefer
enforce: review
baseline: latest
status: verified
compile_exempt: "nightly-only `std::hint::{likely, unlikely}` (E0554 on stable)"
triggers:
  keywords: ["likely", "hint", "code", "structure", "branches", "intrinsics", "nightly"]
  files: ["**/*.rs"]
related: ["rust-opt-cold-unlikely", "rust-opt-inline-never-cold", "rust-perf-profile-first"]
sources:
  - title: "rust-skills: opt-likely-hint"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/opt-likely-hint.md
---
> Use code structure to hint at likely branches; use intrinsics on nightly

## Why

> Note: the Bad snippet intentionally does not compile (demonstrates nightly-only `std::hint::{likely, unlikely}` behind `#![feature(likely_unlikely)]`, which is unavailable on stable).

Modern CPUs predict branches to speculatively execute code. Mispredictions cause pipeline stalls (10-20 cycles). Helping the compiler understand which branches are likely allows it to generate optimal code layout and branch hints, improving performance in hot paths.

## Bad

```rust
// Requires nightly (unstable `std::hint::{likely, unlikely}`)
#![feature(likely_unlikely)]
use std::hint::{likely, unlikely};

fn process(is_corrupted: bool, is_cached: bool) -> i32 {
    if unlikely(is_corrupted) {
        return 0; // handle corruption
    }
    if likely(is_cached) {
        return 1; // fast cached path
    }
    2 // slow uncached path
}
```

## Good

```rust
struct Data;

// Pattern 1: early return keeps the unlikely case out of the hot path
fn process(data: Option<&Data>) -> i32 {
    let Some(_data) = data else { return 0 }; // unlikely
    1 // hot path continues here
}

// Pattern 2: put the likely case in the `if` branch
fn calculate(x: i32) -> i32 {
    if x >= 0 { x * 2 } else { x }
}

// Pattern 3: extract unlikely error paths into a #[cold] function
#[cold]
fn cold_empty_error() -> Result<(), &'static str> {
    Err("empty input")
}

fn hot_path(data: &[u8]) -> Result<(), &'static str> {
    if data.is_empty() {
        return cold_empty_error(); // unlikely
    }
    Ok(())
}
```

## See Also

- [rust-opt-cold-unlikely](opt-cold-unlikely.md) - #[cold] for unlikely functions
- [rust-opt-inline-never-cold](opt-inline-never-cold.md) - Keeping cold code separate
- [rust-perf-profile-first](perf-profile-first.md) - Profile to know what's likely
