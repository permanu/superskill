---
id: rust-opt-inline-always-rare
lang: rust
prefix: opt
title: "Use `#[inline(always)]` sparingly—only for critical hot paths proven by profiling"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["inline", "rare", "sparingly", "critical", "hot", "paths", "proven", "profiling"]
  files: ["**/*.rs"]
  symbols: ["inline"]
related: ["rust-opt-inline-small", "rust-opt-inline-never-cold", "rust-perf-profile-first"]
sources:
  - title: "rust-skills: opt-inline-always-rare"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/opt-inline-always-rare.md
---
> Use `#[inline(always)]` sparingly—only for critical hot paths proven by profiling

## Why

`#[inline(always)]` forces the compiler to inline a function regardless of heuristics. Overuse increases binary size, hurts instruction cache, and can slow down code. The compiler is usually smarter about inlining than humans. Reserve this for measured hot paths where benchmarks prove a benefit.

## Bad

```rust
struct User {
    name: String,
}

// Annotating everything - trusting intuition over data
impl User {
    #[inline(always)]
    pub fn get_name(&self) -> &str {
        &self.name
    }
}

#[inline(always)]
pub fn calculate_tax(amount: f64) -> f64 {
    amount * 0.1
}

#[inline(always)]
fn helper(x: i32) -> i32 {
    x + 1
}

// Result: bloated binary, poor cache utilization
```

## Good

```rust
use std::hash::Hasher;

struct MyHasher {
    state: u64,
}

pub fn calculate_tax(amount: f64) -> f64 {
    amount * 0.1
}

// Only force inline for proven hot paths
impl Hasher for MyHasher {
    // Called millions of times in tight loops; profiling showed 15% improvement
    #[inline(always)]
    fn write(&mut self, bytes: &[u8]) {
        self.state = self.state.wrapping_add(bytes.len() as u64);
    }

    fn finish(&self) -> u64 {
        self.state
    }
}
```

## See Also

- [rust-opt-inline-small](opt-inline-small.md) - Regular inline for small functions
- [rust-opt-inline-never-cold](opt-inline-never-cold.md) - Preventing inlining
- [rust-perf-profile-first](perf-profile-first.md) - Profile before optimizing
