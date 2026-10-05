---
id: rust-api-result-context
lang: rust
prefix: api
title: Attach context to errors where the failure is created, not where it is logged
severity: should
enforce: review
baseline: latest
status: draft
triggers:
  keywords: [error, context, message]
related: [rust-err-result]
sources:
  - title: Rust std - Result::map_err
    url: https://doc.rust-lang.org/std/result/enum.Result.html
---

> Add context where an error is created, not where it is logged.

## Why

Losing the original failure behind a generic message makes the root cause unrecoverable at the call site. Carrying the offending value in the context turns every log line into an actionable diagnostic.

## Bad

```rust
fn load(raw: &str) -> Result<u16, String> {
    raw.parse().map_err(|_| "invalid".to_string())
}
```

## Good

```rust
fn load(raw: &str) -> Result<u16, String> {
    raw.parse().map_err(|e| format!("invalid port: {e}"))
}
```

## See Also

- [rust-err-result](err-result.md) - the propagation rule that pairs with this context rule
