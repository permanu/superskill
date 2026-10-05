---
id: rust-serde-default-compat
lang: rust
prefix: serde
title: "Use `#[serde(default)]` for optional and backward-compatible fields"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["default", "compat", "serde", "optional", "backward-compatible", "fields"]
  files: ["**/*.rs"]
  symbols: ["serde"]
related: ["rust-serde-skip-empty", "rust-api-default-impl"]
sources:
  - title: "rust-skills: serde-default-compat"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/serde-default-compat.md
---
> Use `#[serde(default)]` for optional and backward-compatible fields

## Why

Without `#[serde(default)]`, any field missing from an incoming payload causes deserialization to fail with a "missing field" error. When you add new fields to a struct over time, older payloads that predate those fields will suddenly break. Marking fields (or the whole container) with `#[serde(default)]` fills missing keys from the type's `Default` implementation, enabling graceful forward compatibility.

## Bad

```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
struct Config {
    host: String,
    port: u16,
    timeout_secs: u64,  // newly added — old configs don't have this, so they fail
    retries: u32,       // newly added — same problem
}
```

## Good

```rust
use serde::{Serialize, Deserialize};

fn default_retries() -> u32 { 3 }
#[derive(Serialize, Deserialize, Debug)]
struct Config {
    host: String,
    port: u16,
    // fills from Default::default() (0u64) if missing
    #[serde(default)]
    timeout_secs: u64,
    // fills from the named function if missing
    #[serde(default = "default_retries")]
    retries: u32,
    // fills from Default (None) if missing
    #[serde(default)]
    tls_cert_path: Option<String>,
}

// Alternatively, annotate the whole container:
#[derive(Serialize, Deserialize, Debug, Default)]
#[serde(default)]
struct FeatureFlags {
    enable_caching: bool,
    enable_metrics: bool,
}
```

## See Also

- [rust-serde-skip-empty](serde-skip-empty.md) - omit None/empty values during serialization
- [rust-api-default-impl](api-default-impl.md) - implement `Default` for sensible defaults
