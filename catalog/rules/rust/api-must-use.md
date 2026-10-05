---
id: rust-api-must-use
lang: rust
prefix: api
title: "Mark types and functions with `#[must_use]` when ignoring results is likely a bug"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["must", "mark", "types", "functions", "must_use", "ignoring", "results", "likely"]
  files: ["**/*.rs"]
  symbols: ["must_use"]
related: ["rust-api-builder-must-use", "rust-err-result-over-panic", "rust-lint-deny-correctness"]
sources:
  - title: "rust-skills: api-must-use"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-must-use.md
---
> Mark types and functions with `#[must_use]` when ignoring results is likely a bug

## Why

Some return values should never be ignored—`Result`, locks, RAII guards, computed values that have no side effects. Without `#[must_use]`, silently discarding these values can introduce subtle bugs that are hard to detect. The attribute generates compiler warnings when the value is unused.

## Bad

```rust
struct EmailReceipt;

// Receipt ignored - no warning, delivery status silently dropped
fn send_email(to: &str, body: &str) -> EmailReceipt {
    let _ = (to, body);
    EmailReceipt
}

// Computed value ignored - likely a bug
fn compute_checksum(data: &[u8]) -> u32 {
    data.iter().map(|b| *b as u32).sum()
}

fn main() {
    send_email("user@example.com", "Hello!");  // No warning - receipt dropped!
    // Delivery may have failed, but we don't know

    let data = vec![1, 2, 3, 4];
    compute_checksum(&data);  // Result discarded - pointless call
}
```

## Good

```rust
#[must_use = "the delivery receipt should be handled"]
struct EmailReceipt;

fn send_email(to: &str, body: &str) -> EmailReceipt {
    let _ = (to, body);
    EmailReceipt
}

// Mark pure functions
#[must_use = "this returns a new value and does not modify the input"]
fn compute_checksum(data: &[u8]) -> u32 {
    data.iter().map(|b| *b as u32).sum()
}

fn main() {
    send_email("user@example.com", "Hello!");
    // Warning: unused `EmailReceipt` that must be used

    let data = vec![1, 2, 3, 4];
    compute_checksum(&data);
    // Warning: unused return value of `compute_checksum` that must be used
}
```

## See Also

- [rust-api-builder-must-use](api-builder-must-use.md) - Builder pattern must_use
- [rust-err-result-over-panic](err-result-over-panic.md) - Result types require handling
- [rust-lint-deny-correctness](lint-deny-correctness.md) - Enabling useful lints
