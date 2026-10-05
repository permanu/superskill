---
id: rust-serde-deny-unknown-fields
lang: rust
prefix: serde
title: "Reject unexpected keys with `#[serde(deny_unknown_fields)]`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["deny", "unknown", "fields", "reject", "unexpected", "keys", "serde", "deny_unknown_fields"]
  files: ["**/*.rs"]
  symbols: ["serde"]
related: ["rust-serde-flatten", "rust-api-parse-dont-validate"]
sources:
  - title: "rust-skills: serde-deny-unknown-fields"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/serde-deny-unknown-fields.md
---
> Reject unexpected keys with `#[serde(deny_unknown_fields)]`

## Why

By default, serde silently discards any key in the input that doesn't match a struct field. For user-facing config files and strict API contracts this is dangerous: a typo like `"timout_secs"` passes validation without error, and the intended field is simply never set. `#[serde(deny_unknown_fields)]` turns unrecognized keys into hard errors, surfacing mistakes immediately.

## Bad

```rust
use serde::{Serialize, Deserialize};
use serde_json;

#[derive(Serialize, Deserialize, Debug)]
struct ServerConfig {
    host: String,
    port: u16,
    timeout_secs: u64,
}

fn main() {
    // "timout_secs" is a typo — serde silently ignores it, timeout stays 0
    let json = r#"{"host":"localhost","port":8080,"timout_secs":30}"#;
    let cfg: ServerConfig = serde_json::from_str(json).unwrap();
    println!("{:?}", cfg); // timeout_secs is 0, not 30
}
```

## Good

```rust
use serde::{Serialize, Deserialize};
use serde_json;

#[derive(Serialize, Deserialize, Debug)]
#[serde(deny_unknown_fields)]
struct ServerConfig {
    host: String,
    port: u16,
    timeout_secs: u64,
}

fn parse_config(json: &str) -> Result<ServerConfig, serde_json::Error> {
    serde_json::from_str(json)
}

fn main() {
    // Typo is now a hard error
    let bad = r#"{"host":"localhost","port":8080,"timout_secs":30}"#;
    assert!(parse_config(bad).is_err());

    // Correct input still works
    let good = r#"{"host":"localhost","port":8080,"timeout_secs":30}"#;
    let cfg = parse_config(good).unwrap();
    println!("{:?}", cfg);
}
```

## See Also

- [rust-serde-flatten](serde-flatten.md) - Inline nested structs or collect extra keys (incompatible with deny_unknown_fields)
- [rust-api-parse-dont-validate](api-parse-dont-validate.md) - Parse into validated types at boundaries
