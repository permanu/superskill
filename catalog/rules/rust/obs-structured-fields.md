---
id: rust-obs-structured-fields
lang: rust
prefix: obs
title: "Record structured key-value fields, not values interpolated into the message string"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["structured", "fields", "record", "key-value", "values", "interpolated", "message", "string"]
  files: ["**/*.rs"]
related: ["rust-obs-tracing-over-log", "rust-obs-no-sensitive-data", "rust-obs-error-chain"]
sources:
  - title: "rust-skills: obs-structured-fields"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/obs-structured-fields.md
---
> Record structured key-value fields, not values interpolated into the message string

## Why

When values are interpolated directly into the message string (e.g., `"processed 42 items for user 7 in 120ms"`), they become opaque text. Log aggregators (Loki, Elasticsearch, OpenTelemetry) cannot filter on `items = 42` or group by `user.id` because those values no longer exist as discrete fields. Structured fields keep data machine-parseable, filterable, and chart-able without regex post-processing. `tracing` supports three field sigils: `%expr` for `Display`, `?expr` for `Debug`, and bare `field = value` for typed primitives — the message string should only contain a stable, human-readable description.

## Bad

```rust
use tracing::info;

fn process_batch(user_id: u64, items: usize, elapsed_ms: u64) {
    // Values buried in the message string — unqueryable in aggregators
    info!("processed {} items for user {} in {}ms", items, user_id, elapsed_ms);
}
```

## Good

```rust
use tracing::info;

fn process_batch(user_id: u64, items: usize, elapsed_ms: u64) {
    // Structured: each value is a discrete, queryable field
    info!(user.id = user_id, items, elapsed_ms, "batch processed");
}

#[derive(Debug)]
struct Request {
    path: String,
    method: String,
}

fn handle_request(req: &Request, status: u16) {
    // ?req uses Debug; status is a typed primitive field
    info!(request = ?req, status, "request complete");
}
```

## See Also

- [rust-obs-tracing-over-log](obs-tracing-over-log.md) - Foundational setup for `tracing`
- [rust-obs-no-sensitive-data](obs-no-sensitive-data.md) - never put secrets or PII in structured fields
- [rust-obs-error-chain](obs-error-chain.md) - Log errors as structured fields with full source chain
