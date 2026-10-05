---
id: rust-perf-extend-batch
lang: rust
prefix: perf
title: "Use extend for batch insertions"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["extend", "batch", "insertions"]
  files: ["**/*.rs"]
related: ["rust-mem-with-capacity", "rust-perf-drain-reuse", "rust-mem-reuse-collections"]
sources:
  - title: "rust-skills: perf-extend-batch"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/perf-extend-batch.md
---
> Use extend for batch insertions

## Why

`extend()` can pre-allocate capacity for the incoming elements and insert them in a single operation. Individual `push()` calls may trigger multiple reallocations as the collection grows. For adding multiple elements, `extend()` is both faster and clearer.

## Bad

```rust
struct Result;
struct Source;
impl Source { fn get_results(&self) -> Vec<Result> { Vec::new() } }

// Multiple potential reallocations
fn collect_results(sources: Vec<Source>) -> Vec<Result> {
    let mut results = Vec::new();
    for source in sources {
        for result in source.get_results() {
            results.push(result);  // May reallocate
        }
    }
    results
}
// Loop with push for known data
fn build_list() -> Vec<i32> {
    let mut list = Vec::new();
    for i in 0..1000 { list.push(i); }  // Many reallocations
    list
}
// Appending another collection
fn combine(mut a: Vec<i32>, b: Vec<i32>) -> Vec<i32> {
    for item in b { a.push(item); }
    a
}
```

## Good

```rust
struct Result;
struct Source;
impl Source { fn get_results(&self) -> Vec<Result> { Vec::new() } }

// Single extend with size hint
fn collect_results(sources: Vec<Source>) -> Vec<Result> {
    let mut results = Vec::new();
    for source in sources {
        results.extend(source.get_results());
    }
    results
}

// Direct collection from iterator
fn build_list() -> Vec<i32> {
    (0..1000).collect()
}

// Extend for combining
fn combine(mut a: Vec<i32>, b: Vec<i32>) -> Vec<i32> {
    a.extend(b);
    a
}
```

## See Also

- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocation
- [rust-perf-drain-reuse](perf-drain-reuse.md) - Reusing allocations
- [rust-mem-reuse-collections](mem-reuse-collections.md) - Collection reuse
