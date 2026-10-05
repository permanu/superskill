---
id: rust-api-serde-optional
lang: rust
prefix: api
title: "Make serde a feature flag, not a hard dependency for library crates"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["serde", "optional", "make", "feature", "flag", "hard", "dependency", "library"]
  files: ["**/*.rs"]
related: ["rust-proj-lib-main-split", "rust-api-common-traits", "rust-lint-deny-correctness", "rust-serde-try-from-validate", "rust-serde-rename-all"]
sources:
  - title: "rust-skills: api-serde-optional"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-serde-optional.md
---
> Make serde a feature flag, not a hard dependency for library crates

## Why

Not all users of your library need serialization. Making serde a required dependency adds compile time and binary size for everyone. Feature flags let users opt-in to serde support only when needed, following Rust's philosophy of zero-cost abstractions and minimal dependencies.

## Bad

```rust
// Cargo.toml
// [dependencies]
// serde = { version = "1.0", features = ["derive"] }

// lib.rs
use serde::{Serialize, Deserialize};

// Every user pays for serde, even if they don't need it
#[derive(Serialize, Deserialize)]
pub struct Config {
    pub name: String,
    pub value: i32,
}
```

## Good

```rust
// Cargo.toml
// [dependencies]
// serde = { version = "1.0", features = ["derive"], optional = true }
//
// [features]
// default = []
// serde = ["dep:serde"]

// lib.rs
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Config {
    pub name: String,
    pub value: i32,
}

// Users opt-in:
// my_crate = { version = "1.0", features = ["serde"] }
```

## See Also

- [rust-proj-lib-main-split](proj-lib-main-split.md) - Library structure
- [rust-api-common-traits](api-common-traits.md) - Core trait implementations
- [rust-lint-deny-correctness](lint-deny-correctness.md) - Feature testing
- [rust-serde-try-from-validate](serde-try-from-validate.md) - Validate while deserializing
- [rust-serde-rename-all](serde-rename-all.md) - Match external naming conventions
