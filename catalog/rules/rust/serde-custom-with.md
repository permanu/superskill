---
id: rust-serde-custom-with
lang: rust
prefix: serde
title: "Customize a field's (de)serialization with `with` / `serialize_with` / `deserialize_with`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["custom", "customize", "field", "serialization", "serialize_with", "deserialize_with"]
  files: ["**/*.rs"]
  symbols: ["with", "serialize_with", "deserialize_with"]
related: ["rust-serde-try-from-validate", "rust-type-newtype-validated"]
sources:
  - title: "rust-skills: serde-custom-with"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/serde-custom-with.md
---
> Customize a field's (de)serialization with `with` / `serialize_with` / `deserialize_with`

## Why

Some types have a natural Rust representation that differs from what the wire format expects: a `Duration` stored as whole seconds, raw bytes encoded as base64, a timestamp as an ISO-8601 string. Changing the field type just to satisfy serde pollutes the domain model. A `#[serde(with = "module")]` (or the one-sided `serialize_with`/`deserialize_with`) attributes point serde at custom conversion functions without touching the field type.

## Bad

```rust
use serde::{Serialize, Deserialize};

// Forces a u64 "seconds" field instead of the natural Duration type
#[derive(Serialize, Deserialize, Debug)]
struct Task {
    name: String,
    timeout_secs: u64,   // callers must manually convert to/from Duration
}
```

## Good

```rust
use serde::{Serialize, Deserialize, Serializer, Deserializer};
use std::time::Duration;

mod duration_secs {
    use super::*;

    pub fn serialize<S: Serializer>(duration: &Duration, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_u64(duration.as_secs())
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Duration, D::Error> {
        let secs = u64::deserialize(deserializer)?;
        Ok(Duration::from_secs(secs))
    }
}

#[derive(Serialize, Deserialize, Debug)]
struct Task {
    // wire format: {"timeout": 30} — seconds as a plain u64
    #[serde(with = "duration_secs", rename = "timeout")]
    timeout: Duration,
    // one-sided variant: customize only the serialize direction
    #[serde(serialize_with = "duration_secs::serialize")]
    elapsed: Duration,
}
```

## See Also

- [rust-serde-try-from-validate](serde-try-from-validate.md) - validate while deserializing with TryFrom
- [rust-type-newtype-validated](type-newtype-validated.md) - Newtypes for validated data
