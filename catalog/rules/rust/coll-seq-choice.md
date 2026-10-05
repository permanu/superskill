---
id: rust-coll-seq-choice
lang: rust
prefix: coll
title: "Default to `Vec`; use `VecDeque` for queue/deque behaviour; avoid `LinkedList`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["seq", "choice", "default", "vec", "vecdeque", "queue", "deque", "behaviour"]
  files: ["**/*.rs"]
  symbols: ["Vec", "VecDeque", "LinkedList"]
related: ["rust-mem-with-capacity", "rust-perf-drain-reuse", "rust-coll-map-choice"]
sources:
  - title: "rust-skills: coll-seq-choice"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/coll-seq-choice.md
---
> Default to `Vec`; use `VecDeque` for queue/deque behaviour; avoid `LinkedList`

## Why

`Vec<T>` is a contiguous growable array — the right sequence type for almost every use case. Contiguous layout means the CPU prefetcher works in your favour and each element is a single pointer dereference away. `VecDeque<T>` is a ring buffer with O(1) amortised push and pop at **both** ends; reach for it when you need a FIFO queue or a sliding window. `LinkedList<T>` is heap-allocated per node and pointer-chased on every access; in practice it is almost always slower than `Vec` or `VecDeque` for real workloads, and the standard library itself discourages its use.

## Bad

```rust
fn process_queue(items: Vec<String>) {
    let mut queue = items;
    while !queue.is_empty() {
        // O(n): every element shifts left after removal.
        let item = queue.remove(0);
        println!("processing: {item}");
    }
}

fn main() {
    process_queue(vec![
        "first".to_string(),
        "second".to_string(),
        "third".to_string(),
    ]);
}

// `remove(0)` on a `Vec` is O(n) because it must shift every remaining element. A loop of n items becomes O(n²).
```

## Good

```rust
use std::collections::VecDeque;

fn process_queue(items: impl IntoIterator<Item = String>) {
    // VecDeque: O(1) pop_front — the right tool for a FIFO queue.
    let mut queue: VecDeque<String> = items.into_iter().collect();
    while let Some(item) = queue.pop_front() {
        println!("processing: {item}");
    }
}

fn sliding_window_max(values: &[i32], k: usize) -> Vec<i32> {
    // VecDeque also shines as a fixed-size sliding window.
    let mut window: VecDeque<i32> = VecDeque::with_capacity(k);
    let mut result = Vec::with_capacity(values.len().saturating_sub(k) + 1);
    for &v in values {
        window.push_back(v);
        if window.len() > k {
            window.pop_front();
        }
        if window.len() == k {
            result.push(*window.iter().max().unwrap());
        }
    }
    result
}
```

## See Also

- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocate with `with_capacity` when size is known
- [rust-perf-drain-reuse](perf-drain-reuse.md) - Drain a collection to reuse its allocation
- [rust-coll-map-choice](coll-map-choice.md) - Choosing the right map type
