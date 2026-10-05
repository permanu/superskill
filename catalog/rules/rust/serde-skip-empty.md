---
id: rust-serde-skip-empty
lang: rust
prefix: serde
title: "Omit empty fields with `skip_serializing_if`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["skip", "empty", "omit", "fields", "skip_serializing_if"]
  files: ["**/*.rs"]
  symbols: ["skip_serializing_if"]
related: ["rust-serde-default-compat", "rust-serde-rename-all"]
sources:
  - title: "rust-skills: serde-skip-empty"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/serde-skip-empty.md
---
> Omit empty fields with `skip_serializing_if`

## Why

Serializing `None` values as `null` and empty collections as `[]` bloats payloads, clutters logs, and can confuse clients that distinguish between a missing key and an explicit null. `#[serde(skip_serializing_if = "predicate")]` conditionally drops a field from output when the predicate returns true, keeping the wire format lean. `#[serde(skip)]` goes further and excludes a field from both serialization and deserialization entirely.

## Bad

```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
struct ApiResponse {
    id: u64,
    name: String,
    description: Option<String>,  // serializes as null when None
    tags: Vec<String>,            // serializes as [] when empty
    error: Option<String>,        // serializes as null when None
}

// Produces: `{"id":1,"name":"Alice","description":null,"tags":[],"error":null}`
```

## Good

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct ApiResponse {
    id: u64,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    // Internal field excluded from both directions.
    #[serde(skip)]
    _cache_key: Option<String>,
}

// Produces: {"id":1,"name":"Alice"} — empty or None fields are omitted.
```

## See Also

- [rust-serde-default-compat](serde-default-compat.md) - fill missing fields from Default on deserialization
- [rust-serde-rename-all](serde-rename-all.md) - Match external naming conventions with rename_all
