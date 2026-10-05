---
id: rust-perf-collect-into
lang: rust
prefix: perf
title: "Reuse existing buffers with `extend`; `collect_into` is nightly-only"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["collect", "collect_into", "reusing", "containers"]
  files: ["**/*.rs"]
related: ["rust-perf-drain-reuse", "rust-mem-reuse-collections", "rust-perf-extend-batch"]
sources:
  - title: "rust-skills: perf-collect-into"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/perf-collect-into.md
---
> Reuse existing buffers with `extend`; `collect_into` is nightly-only

## Why

`collect_into()` allows collecting iterator results into an existing collection, reusing its allocation. This avoids the allocation that `collect()` would make for a new collection.

> **Note:** `collect_into` is currently **nightly-only** (requires `#![feature(iter_collect_into)]`, tracking issue [#94780](https://github.com/rust-lang/rust/issues/94780)). On stable Rust, use `extend()` instead — see the Stable Alternative section below.

## Bad

```rust
fn process(values: &[i32]) {
    let _ = values;
}

// Allocates new Vec each time
fn process_batches(batches: Vec<Vec<i32>>) -> Vec<Vec<i32>> {
    batches.into_iter()
        .map(|batch| {
            batch.into_iter()
                .filter(|x| *x > 0)
                .collect::<Vec<_>>()  // New allocation per batch
        })
        .collect()
}

// Can't reuse cleared buffer
fn filter_loop(data: &[Vec<i32>]) {
    for batch in data {
        let filtered: Vec<_> = batch.iter()
            .filter(|&&x| x > 0)
            .copied()
            .collect();  // New allocation each iteration
        process(&filtered);
    }
}
```

## Good

```rust
fn process(values: &[i32]) {
    let _ = values;
}

// Stable approach: reuse buffer with extend
fn filter_loop(data: &[Vec<i32>]) {
    let mut buffer = Vec::new();
    
    for batch in data {
        buffer.clear();  // Keep allocation
        buffer.extend(
            batch.iter()
                .filter(|&&x| x > 0)
                .copied()
        );
        process(&buffer);
    }
}
```

## See Also

- [rust-perf-drain-reuse](perf-drain-reuse.md) - Drain for reuse
- [rust-mem-reuse-collections](mem-reuse-collections.md) - Collection reuse
- [rust-perf-extend-batch](perf-extend-batch.md) - Batch extensions
