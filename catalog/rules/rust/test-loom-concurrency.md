---
id: rust-test-loom-concurrency
lang: rust
prefix: test
title: "Use `loom` to exhaustively test lock-free and concurrent code"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["loom", "concurrency", "exhaustively", "test", "lock-free", "concurrent", "code"]
  files: ["**/*.rs"]
  symbols: ["loom"]
related: ["rust-conc-atomic-ordering", "rust-test-criterion-bench"]
sources:
  - title: "rust-skills: test-loom-concurrency"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-loom-concurrency.md
---
> Use `loom` to exhaustively test lock-free and concurrent code

## Why

Probabilistic stress tests can run millions of iterations and still miss a race condition that only manifests under a specific thread interleaving. `loom` systematically explores every thread scheduling and memory-reordering permitted by the C11 memory model, turning "we ran it a lot and it seemed fine" into a proof of correctness for the interleavings that exist within the model bounds. Tokio uses loom to verify its internal synchronization primitives.

## Bad

```rust
// Stress test: might pass a billion times, still doesn't prove correctness
#[test]
fn stress_test_flag() {
    use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
    let flag = Arc::new(AtomicBool::new(false));
    for _ in 0..1_000_000 {
        let flag = Arc::clone(&flag);
        std::thread::spawn(move || {
            flag.store(true, Ordering::Relaxed);
        });
    }
    // races may never surface under the OS scheduler used here
}
```

## Good

```rust
// src/flag.rs: production and loom builds share this code
#[cfg(loom)]
use loom::sync::atomic::{AtomicBool, Ordering};
#[cfg(not(loom))]
use std::sync::atomic::{AtomicBool, Ordering};

pub struct Flag(AtomicBool);
impl Flag {
    pub const fn new() -> Self { Self(AtomicBool::new(false)) }
    pub fn set(&self) { self.0.store(true, Ordering::Release); }
    pub fn is_set(&self) -> bool { self.0.load(Ordering::Acquire) }
}

// tests/loom_flag.rs
#[cfg(loom)] #[test]
fn flag_visibility() {
    use loom::sync::Arc;
    loom::model(|| {
        let flag = Arc::new(Flag::new());
        let flag2 = Arc::clone(&flag);
        let writer = loom::thread::spawn(move || flag2.set());
        writer.join().unwrap();
        assert!(flag.is_set());
    });
}
```

## See Also

- [rust-conc-atomic-ordering](conc-atomic-ordering.md) - Choose correct memory orderings
- [rust-test-criterion-bench](test-criterion-bench.md) - Benchmark concurrent code after verifying correctness
