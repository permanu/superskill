---
id: rust-perf-drain-reuse
lang: rust
prefix: perf
title: "Use drain to reuse allocations"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["drain", "reuse", "allocations"]
  files: ["**/*.rs"]
related: ["rust-mem-reuse-collections", "rust-perf-extend-batch", "rust-mem-with-capacity"]
sources:
  - title: "rust-skills: perf-drain-reuse"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/perf-drain-reuse.md
---
> Use drain to reuse allocations

## Why

`drain()` removes elements from a collection while keeping its allocated capacity. This allows reusing the same allocation across iterations, avoiding repeated allocate/deallocate cycles in loops.

## Bad

```rust
struct Item;

fn process_batch(_batch: Vec<Item>) {}
fn process(_buffer: &[Item]) {}

// Allocates a new Vec every iteration
fn process_batches(data: Vec<Item>) {
    let mut remaining = data;
    while !remaining.is_empty() {
        let batch: Vec<_> = remaining.drain(..100.min(remaining.len())).collect();
        process_batch(batch);  // batch allocates new every time - bad
    }
}

// Clears and reallocates
fn reuse_buffer() {
    for _ in 0..1000 {
        let mut buffer = Vec::new();  // Allocates each iteration
        buffer.push(Item);
        process(&buffer);
    }
}
```

## Good

```rust
struct Item;

fn process_batch(_batch: &[Item]) {}
fn process(_buffer: &[Item]) {}

// Reuses the allocation with drain
fn process_batches(mut data: Vec<Item>) {
    let mut batch = Vec::with_capacity(100);
    while !data.is_empty() {
        batch.extend(data.drain(..100.min(data.len())));
        process_batch(&batch);
        batch.clear();  // Keeps capacity
    }
}

// Reuses buffer across iterations
fn reuse_buffer() {
    let mut buffer = Vec::new();
    for _ in 0..1000 {
        buffer.clear();  // Keeps capacity
        buffer.push(Item);
        process(&buffer);
    }
}
```

## See Also

- [rust-mem-reuse-collections](mem-reuse-collections.md) - Reusing collections
- [rust-perf-extend-batch](perf-extend-batch.md) - Batch insertions
- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocation
