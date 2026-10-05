---
id: rust-err-dup-section
lang: rust
prefix: err
title: Return Result from fallible functions instead of panicking at call sites
severity: must
enforce: review
baseline: latest
status: draft
sources:
  - title: Rust Book - Recoverable Errors with Result
    url: https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html
---

> Return Result from fallible functions instead of panicking.

## Why

A panic aborts the caller's control flow and turns a recoverable failure into a crash.

## Bad

```rust
fn read_port(raw: &str) -> u16 {
    raw.parse().unwrap()
}
```

## Bad

```rust
fn read_other(raw: &str) -> u16 {
    raw.parse().unwrap()
}
```

## Good

```rust
fn read_port(raw: &str) -> Result<u16, std::num::ParseIntError> {
    raw.parse()
}
```
