---
id: rust-serde-rename-all
lang: rust
prefix: serde
title: "Match the external naming convention with `#[serde(rename_all = ...)]`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["rename", "match", "external", "naming", "convention", "serde", "rename_all"]
  files: ["**/*.rs"]
  symbols: ["serde"]
related: ["rust-serde-default-compat", "rust-api-serde-optional"]
sources:
  - title: "rust-skills: serde-rename-all"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/serde-rename-all.md
---
> Match the external naming convention with `#[serde(rename_all = ...)]`

## Why

Rust fields are `snake_case` by convention, while JSON APIs, GraphQL responses, and config formats use `camelCase`, `kebab-case`, or `SCREAMING_SNAKE_CASE`. Renaming every field individually with `#[serde(rename = "...")]` is noisy and error-prone. A single `#[serde(rename_all = "camelCase")]` on the container keeps Rust idiomatic and the wire format correct in one declaration.

## Bad

```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct UserProfile {
    #[serde(rename = "firstName")]
    first_name: String,
    #[serde(rename = "lastName")]
    last_name: String,
    #[serde(rename = "emailAddress")]
    email_address: String,
    #[serde(rename = "isActive")]
    is_active: bool,
}
```

## Good

```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UserProfile {
    first_name: String,
    last_name: String,
    email_address: String,
    is_active: bool,
    // per-field override: "type" is a keyword in Rust, so we rename it explicitly
    #[serde(rename = "type")]
    user_type: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
enum Status {
    Active,
    Inactive,
    PendingVerification,
}
```

## See Also

- [rust-serde-default-compat](serde-default-compat.md) - Add default values for backward-compatible fields
- [rust-api-serde-optional](api-serde-optional.md) - Gate serde behind a feature flag in libraries
