---
id: rust-serde-flatten
lang: rust
prefix: serde
title: "Inline nested structs or capture extra keys with `#[serde(flatten)]`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["flatten", "inline", "nested", "structs", "capture", "extra", "keys", "serde"]
  files: ["**/*.rs"]
  symbols: ["serde"]
related: ["rust-serde-deny-unknown-fields", "rust-serde-enum-representation"]
sources:
  - title: "rust-skills: serde-flatten"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/serde-flatten.md
---
> Inline nested structs or capture extra keys with `#[serde(flatten)]`

## Why

APIs frequently share a common set of fields across multiple message types (pagination metadata, audit timestamps, error envelopes). Duplicating those fields in every struct is fragile. `#[serde(flatten)]` merges a nested struct's fields directly into the parent's wire representation, so the JSON looks flat while the Rust code stays modular. The same attribute can also collect all unknown keys into a `HashMap`, giving you a "catch-all" bucket.

## Bad

```rust
use serde::{Serialize, Deserialize};

// Duplicated pagination fields in every list response
#[derive(Serialize, Deserialize, Debug)]
struct UserListResponse {
    users: Vec<String>,
    page: u32,
    per_page: u32,
    total: u64,
}

#[derive(Serialize, Deserialize, Debug)]
struct PostListResponse {
    posts: Vec<String>,
    page: u32,       // copy-paste
    per_page: u32,   // copy-paste
    total: u64,      // copy-paste
}
```

## Good

```rust
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
struct Pagination {
    page: u32,
    per_page: u32,
    total: u64,
}

#[derive(Serialize, Deserialize, Debug)]
struct UserListResponse {
    users: Vec<String>,
    #[serde(flatten)]
    pagination: Pagination,
}

#[derive(Serialize, Deserialize, Debug)]
struct FlexibleConfig {
    name: String,
    #[serde(flatten)]
    extra: HashMap<String, serde_json::Value>,
}
// `UserListResponse` serializes flat: users plus page, per_page, total.
```

## See Also

- [rust-serde-deny-unknown-fields](serde-deny-unknown-fields.md) - Reject unexpected keys (incompatible with flatten)
- [rust-serde-enum-representation](serde-enum-representation.md) - Choose enum tagging strategy
