---
id: rust-mem-with-capacity
lang: rust
prefix: mem
title: "Use `with_capacity()` when size is known"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["capacity", "with_capacity", "size", "known"]
  files: ["**/*.rs"]
  symbols: ["with_capacity"]
related: ["rust-mem-reuse-collections", "rust-mem-smallvec", "rust-perf-extend-batch", "rust-coll-seq-choice"]
sources:
  - title: "rust-skills: mem-with-capacity"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-with-capacity.md
  - title: "github.com/sharkdp/fd/blob/master/src/walk.rs"
    url: https://github.com/sharkdp/fd/blob/master/src/walk.rs
---
> Use `with_capacity()` when size is known

## Why

When you know (or can estimate) the final size of a collection, pre-allocating avoids multiple reallocations as it grows. Each reallocation copies all existing elements, so avoiding them can dramatically improve performance.

## Bad

```rust
use std::collections::HashMap;

fn main() {
    // Vec starts empty and reallocates repeatedly as it grows
    let mut results = Vec::new();
    for i in 0..1000 {
        results.push(i * 2);
    }

    // String grows the same way
    let words = vec!["hello", "world"];
    let mut output = String::new();
    for word in words {
        output.push_str(word);
        output.push(' ');
    }

    // HashMap default capacity is small
    let pairs = vec![("a", 1), ("b", 2)];
    let mut map = HashMap::new();
    for (k, v) in pairs {
        map.insert(k, v);
    }
}
```

## Good

```rust
use std::collections::HashMap;

fn main() {
    // Pre-allocate the exact size: no reallocations
    let mut results = Vec::with_capacity(1000);
    for i in 0..1000 {
        results.push(i * 2);
    }

    // Pre-allocate the string
    let words = vec!["hello", "world"];
    let estimated_len = words.iter().map(|w| w.len() + 1).sum();
    let mut output = String::with_capacity(estimated_len);
    for word in words {
        output.push_str(word);
        output.push(' ');
    }

    // Pre-allocate the HashMap
    let pairs = vec![("a", 1), ("b", 2)];
    let mut map = HashMap::with_capacity(pairs.len());
    for (k, v) in pairs {
        map.insert(k, v);
    }
}
```

## See Also

- [rust-mem-reuse-collections](mem-reuse-collections.md) - Reuse collections with clear()
- [rust-mem-smallvec](mem-smallvec.md) - Use SmallVec for usually-small collections
- [rust-perf-extend-batch](perf-extend-batch.md) - Use extend() for batch insertions
- [rust-coll-seq-choice](coll-seq-choice.md) - Pick the right sequence type
