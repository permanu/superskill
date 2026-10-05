---
id: rust-mem-reuse-collections
lang: rust
prefix: mem
title: "Clear and reuse collections instead of creating new ones in loops"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["reuse", "collections", "clear", "creating", "new", "ones", "loops"]
  files: ["**/*.rs"]
related: ["rust-mem-with-capacity", "rust-mem-clone-from", "rust-mem-write-over-format"]
sources:
  - title: "rust-skills: mem-reuse-collections"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-reuse-collections.md
---
> Clear and reuse collections instead of creating new ones in loops

## Why

Creating new `Vec`, `String`, or `HashMap` instances in hot loops generates significant allocator pressure. Clearing a collection and reusing it keeps the existing capacity, avoiding repeated allocation/deallocation cycles. This is especially impactful for frequently-executed code paths.

## Bad

```rust
struct Item { name: String, value: i32 }
struct Batch { items: Vec<Item> }

fn process_batches(batches: &[Batch]) -> Vec<i32> {
    let mut results = Vec::new();
    for batch in batches {
        let mut temp = Vec::new();  // Allocates every iteration
        for item in &batch.items {
            temp.push(item.value);
        }
        results.push(temp.iter().sum());
        // temp dropped here, deallocation
    }
    results
}

fn format_lines(items: &[Item]) -> String {
    let mut output = String::new();
    for item in items {
        let line = format!("{}: {}", item.name, item.value);  // Allocates
        output.push_str(&line);
        output.push('\n');
    }
    output
}
```

## Good

```rust
struct Item { name: String, value: i32 }
struct Batch { items: Vec<Item> }

fn process_batches(batches: &[Batch]) -> Vec<i32> {
    let mut results = Vec::with_capacity(batches.len());
    let mut temp = Vec::new();  // Allocate once outside loop
    for batch in batches {
        temp.clear();  // Reuse allocation, reset length
        for item in &batch.items {
            temp.push(item.value);
        }
        results.push(temp.iter().sum());
    }
    results
}

fn format_lines(items: &[Item]) -> String {
    use std::fmt::Write;
    let mut output = String::new();
    for item in items {
        write!(output, "{}: {}\n", item.name, item.value).unwrap();
    }
    output
}
```

## See Also

- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocating capacity
- [rust-mem-clone-from](mem-clone-from.md) - Reusing allocations when cloning
- [rust-mem-write-over-format](mem-write-over-format.md) - Avoiding format! allocations
