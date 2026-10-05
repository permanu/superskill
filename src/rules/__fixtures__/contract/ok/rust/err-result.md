---
id: rust-err-result
lang: rust
prefix: err
title: Return Result from fallible functions instead of panicking at call sites
severity: must
enforce: review
baseline: latest
status: draft
triggers:
  keywords: [error, result, panic, propagate]
  files: ["**/*.rs"]
  symbols: [Result]
related: [rust-api-result-context]
sources:
  - title: Rust Book - Recoverable Errors with Result
    url: https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html
---

> Return Result from fallible functions instead of panicking.

## Why

A panic aborts the caller's control flow and turns a recoverable failure into a crash. Returning Result forces every caller to decide how to handle the failure and keeps the error path visible in the type system.

## Bad

```rust
fn read_port(raw: &str) -> u16 {
    raw.parse().unwrap()
}
```

## Good

```rust
fn read_port(raw: &str) -> Result<u16, std::num::ParseIntError> {
    raw.parse()
}
```

## See Also

- [rust-api-result-context](api-result-context.md) - how to add context to the errors this rule propagates
