---
id: rust-own-borrow-over-clone
lang: rust
prefix: own
title: "Prefer `&T` borrowing over `.clone()`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["borrow", "clone", "borrowing"]
  files: ["**/*.rs"]
related: ["rust-own-slice-over-vec", "rust-own-cow-conditional", "rust-mem-clone-from", "rust-mem-take-replace"]
sources:
  - title: "rust-skills: own-borrow-over-clone"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/own-borrow-over-clone.md
  - title: "github.com/BurntSushi/ripgrep/blob/master/crates/globset/src/pathutil.rs"
    url: https://github.com/BurntSushi/ripgrep/blob/master/crates/globset/src/pathutil.rs
---
> Prefer `&T` borrowing over `.clone()`

## Why

Cloning allocates new memory and copies data, while borrowing is free. Unnecessary clones can significantly impact performance, especially in hot paths or with large data structures.

## Bad

```rust
fn process(data: &String) {
    let local = data.clone();  // Unnecessary allocation!
    println!("{}", local);
}

fn count_words(text: &String) -> usize {
    let owned = text.clone();  // Why clone just to read?
    owned.split_whitespace().count()
}

// Clone in a loop - multiplied cost
fn process_all(items: &[String]) {
    for item in items {
        let copy = item.clone();  // N allocations!
        handle(&copy);
    }
}

fn handle(text: &str) {
    println!("{}", text);
}
```

## Good

```rust
fn process(data: &str) {  // Accept &str, more flexible
    println!("{}", data);  // No allocation needed
}

fn count_words(text: &str) -> usize {
    text.split_whitespace().count()  // Just borrow
}

// Borrow in a loop - zero allocations
fn process_all(items: &[String]) {
    for item in items {
        handle(item);  // Pass reference
    }
}

fn handle(text: &str) {
    println!("{}", text);
}
```

## See Also

- [rust-own-slice-over-vec](own-slice-over-vec.md) - Accept slices instead of references to collections
- [rust-own-cow-conditional](own-cow-conditional.md) - Use Cow for conditional ownership
- [rust-mem-clone-from](mem-clone-from.md) - Reuse allocations when cloning
- [rust-mem-take-replace](mem-take-replace.md) - Move out of &mut without cloning
