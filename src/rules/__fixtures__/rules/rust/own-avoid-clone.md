---
id: rust-own-avoid-clone
lang: rust
prefix: own
title: Borrow values instead of cloning them to satisfy the checker
severity: should
enforce: review
baseline: Rust 1.94 / 2024 edition
status: verified
triggers:
  keywords: [clone, borrow, ownership]
  files: ["**/*.rs"]
  symbols: [Clone]
sources:
  - title: The Rust Programming Language - References and Borrowing
    url: https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html
---
> Take a reference when the callee only reads the value.

## Why

A clone allocates and hides the ownership question. Borrowing documents that the callee does not take ownership.

## Bad

```rust
fn total(values: Vec<u32>) -> u32 {
    values.iter().sum()
}
```

## Good

```rust
fn total(values: &[u32]) -> u32 {
    values.iter().sum()
}
```
