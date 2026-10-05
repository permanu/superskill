---
id: rust-perf-chain-avoid
lang: rust
prefix: perf
title: "Avoid chain in hot loops"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["chain", "hot", "loops"]
  files: ["**/*.rs"]
related: ["rust-perf-iter-over-index", "rust-perf-extend-batch", "rust-opt-cache-friendly"]
sources:
  - title: "rust-skills: perf-chain-avoid"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/perf-chain-avoid.md
---
> Avoid chain in hot loops

## Why

`Iterator::chain()` adds overhead for checking which iterator is active on every `.next()` call. In hot loops, this branch prediction overhead can impact performance. For performance-critical code, prefer single iterators or pre-combined collections.

## Bad

```rust
// Chain in hot inner loop
fn process_hot_path(a: &[i32], b: &[i32]) -> i64 {
    let mut sum = 0i64;
    
    // Called millions of times
    for _ in 0..1_000_000 {
        for x in a.iter().chain(b.iter()) {  // Branch every iteration
            sum += *x as i64;
        }
    }
    sum
}

// Chaining multiple small slices in tight loop
fn combine_results(parts: &[&[u8]]) -> Vec<u8> {
    let mut result = Vec::new();
    for part in parts {
        for byte in std::iter::once(&0u8).chain(part.iter()) {
            result.push(*byte);
        }
    }
    result
}
```

## Good

```rust
// Separate loops - branch-free inner loops
fn process_hot_path(a: &[i32], b: &[i32]) -> i64 {
    let mut sum = 0i64;
    
    for _ in 0..1_000_000 {
        for x in a {
            sum += *x as i64;
        }
        for x in b {
            sum += *x as i64;
        }
    }
    sum
}

// Pre-combine outside hot loop
fn combine_results(parts: &[&[u8]]) -> Vec<u8> {
    let mut result = Vec::new();
    for part in parts {
        result.push(0u8);
        result.extend_from_slice(part);
    }
    result
}
```

## See Also

- [rust-perf-iter-over-index](perf-iter-over-index.md) - Prefer iterators
- [rust-perf-extend-batch](perf-extend-batch.md) - Batch insertions
- [rust-opt-cache-friendly](opt-cache-friendly.md) - Cache-friendly patterns
