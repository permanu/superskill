---
id: rust-conc-scoped-threads
lang: rust
prefix: conc
title: "Use `std::thread::scope` to borrow stack data across threads"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["scoped", "threads", "std", "thread", "scope", "borrow", "stack", "data"]
  files: ["**/*.rs"]
  symbols: ["thread::scope"]
related: ["rust-own-arc-shared", "rust-conc-rayon-par-iter", "rust-async-spawn-blocking"]
sources:
  - title: "rust-skills: conc-scoped-threads"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/conc-scoped-threads.md
---
> Use `std::thread::scope` to borrow stack data across threads

## Why

Scoped threads guarantee that all threads spawned inside the scope join before `thread::scope` returns. This lifetime guarantee lets spawned threads borrow non-`'static` data from the enclosing stack frame — no `Arc`, no cloning, no heap allocation required. For short parallel tasks that need to read or write local data, scoped threads are simpler and cheaper than wrapping everything in `Arc<Mutex<...>>`.

## Bad

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn parallel_sum(data: &[i64]) -> i64 {
    // Arc + clone just to share a slice — heap overhead, boilerplate
    let data = Arc::new(data.to_vec()); // unnecessary clone of entire slice
    let mid = data.len() / 2;

    let data1 = Arc::clone(&data);
    let h1 = thread::spawn(move || data1[..mid].iter().sum::<i64>());

    let data2 = Arc::clone(&data);
    let h2 = thread::spawn(move || data2[mid..].iter().sum::<i64>());

    h1.join().unwrap() + h2.join().unwrap()
}
```

## Good

```rust
use std::thread;

fn parallel_sum(data: &[i64]) -> i64 {
    let mid = data.len() / 2;
    let (left, right) = data.split_at(mid);

    thread::scope(|s| {
        let h1 = s.spawn(|| left.iter().sum::<i64>());
        let h2 = s.spawn(|| right.iter().sum::<i64>());
        h1.join().unwrap() + h2.join().unwrap()
    })
}

// Mutable borrows work too — as long as they don't alias
fn parallel_fill(left: &mut [u8], right: &mut [u8]) {
    thread::scope(|s| {
        s.spawn(|| left.fill(0xAA));
        s.spawn(|| right.fill(0xBB));
    });
    // both halves have been written; scope guarantees completion
}
```

## See Also

- [rust-own-arc-shared](own-arc-shared.md) - use `Arc<T>` when data genuinely outlives the parallel task
- [rust-conc-rayon-par-iter](conc-rayon-par-iter.md) - Higher-level data parallelism for collections
- [rust-async-spawn-blocking](async-spawn-blocking.md) - Offload blocking work from async runtimes
