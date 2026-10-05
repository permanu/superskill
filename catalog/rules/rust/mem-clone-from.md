---
id: rust-mem-clone-from
lang: rust
prefix: mem
title: "Use `clone_from()` to reuse allocations when repeatedly cloning"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["clone", "clone_from", "reuse", "allocations", "repeatedly", "cloning"]
  files: ["**/*.rs"]
  symbols: ["clone_from"]
related: ["rust-mem-with-capacity", "rust-mem-reuse-collections", "rust-own-clone-explicit"]
sources:
  - title: "rust-skills: mem-clone-from"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-clone-from.md
---
> Use `clone_from()` to reuse allocations when repeatedly cloning

## Why

`x = y.clone()` drops x's allocation and creates a new one from y. `x.clone_from(&y)` reuses x's existing allocation if possible, avoiding the allocation overhead. For repeatedly cloning into the same variable (loops, buffers), this can significantly reduce allocator pressure.

## Bad

```rust
fn process(s: &str) {
    println!("{}", s);
}

fn main() {
    let mut buffer = String::with_capacity(1024);
    let sources = vec![String::from("hello"), String::from("world")];

    for source in sources {
        buffer = source.clone();  // Drops old allocation, allocates new
        process(&buffer);
    }
}

// Each iteration:
// 1. Drops buffer's 1024-byte allocation
// 2. Allocates new memory for source.clone()
// Allocator thrashing!
```

## Good

```rust
fn process(s: &str) {
    println!("{}", s);
}

fn main() {
    let mut buffer = String::with_capacity(1024);
    let sources = vec![String::from("hello"), String::from("world")];

    for source in sources {
        buffer.clone_from(&source);  // Reuses allocation if capacity sufficient
        process(&buffer);
    }
}

// If source.len() <= 1024, no allocation happens
// Just copies bytes into existing buffer
```

## See Also

- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocating capacity
- [rust-mem-reuse-collections](mem-reuse-collections.md) - Reusing collection allocations
- [rust-own-clone-explicit](own-clone-explicit.md) - When Clone is appropriate
