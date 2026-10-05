---
id: rust-coll-binaryheap
lang: rust
prefix: coll
title: "Use `BinaryHeap` for a priority queue or repeated max-extraction"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["binaryheap", "priority", "queue", "repeated", "max-extraction"]
  files: ["**/*.rs"]
  symbols: ["BinaryHeap"]
related: ["rust-coll-seq-choice", "rust-perf-iter-over-index"]
sources:
  - title: "rust-skills: coll-binaryheap"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/coll-binaryheap.md
---
> Use `BinaryHeap` for a priority queue or repeated max-extraction

## Why

`std::collections::BinaryHeap<T>` is a max-heap with O(log n) `push` and `pop` (extract-max) and O(1) `peek`. When you repeatedly need the largest (or smallest) element from a growing or shrinking set, it beats sorting a `Vec` after every insertion — sorting is O(n log n) each time, while a heap amortises that cost to O(log n) per operation. For a **min-heap**, wrap your values in `std::cmp::Reverse<T>`; the heap's ordering flips, and the smallest value is extracted first.

## Bad

```rust
fn top_priority_task(tasks: &mut Vec<(u32, String)>) -> Option<String> {
    if tasks.is_empty() {
        return None;
    }
    // O(n) scan to find the max, then O(n) shift to remove it — O(n) per call.
    let max_idx = tasks
        .iter()
        .enumerate()
        .max_by_key(|(_, (p, _))| *p)
        .map(|(i, _)| i)?;
    Some(tasks.remove(max_idx).1)
}

fn main() {
    let mut tasks = vec![
        (3, "low priority".to_string()),
        (10, "urgent".to_string()),
        (7, "medium priority".to_string()),
    ];
    // Repeated calls become O(n²) overall.
    while let Some(task) = top_priority_task(&mut tasks) {
        println!("running: {task}");
    }
}
```

## Good

```rust
use std::cmp::Reverse;
use std::collections::BinaryHeap;

fn main() {
    // Max-heap: O(log n) push/pop, extracts the largest first.
    let mut jobs = BinaryHeap::new();
    jobs.push((3, "low priority"));
    jobs.push((10, "urgent"));
    jobs.push((7, "medium"));
    while let Some((priority, task)) = jobs.pop() {
        println!("running [priority={priority}]: {task}");
    }

    // Min-heap via Reverse: keep the k largest values in O(n log k).
    let mut min_heap: BinaryHeap<Reverse<i32>> = BinaryHeap::with_capacity(4);
    for v in [4, 1, 9, 2, 7, 5, 8] {
        min_heap.push(Reverse(v));
        if min_heap.len() > 3 {
            min_heap.pop(); // discard the smallest
        }
    }
    let mut top3: Vec<i32> = min_heap.into_iter().map(|Reverse(v)| v).collect();
    top3.sort_unstable_by(|a, b| b.cmp(a)); // [9, 8, 7]
}
```

## See Also

- [rust-coll-seq-choice](coll-seq-choice.md) - choosing between `Vec`, `VecDeque`, and `LinkedList`
- [rust-perf-iter-over-index](perf-iter-over-index.md) - Prefer iterators over manual indexing when draining results
