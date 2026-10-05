---
id: rust-api-default-impl
lang: rust
prefix: api
title: "Implement `Default` for types with sensible default values"
severity: should
enforce: review
baseline: latest
status: verified
compile_exempt: "intentional compile-error demonstration"
triggers:
  keywords: ["default", "impl", "implement", "types", "sensible", "values"]
  files: ["**/*.rs"]
  symbols: ["Default"]
related: ["rust-api-builder-pattern", "rust-api-common-traits", "rust-api-from-not-into"]
sources:
  - title: "rust-skills: api-default-impl"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-default-impl.md
---
> Implement `Default` for types with sensible default values

## Why

> Note: the Bad snippet intentionally does not compile (demonstrates `Default::default()` unavailable when `Default` is not implemented).

`Default` is a standard trait that provides a canonical way to create a default instance. It integrates with many ecosystem patterns: `Option::unwrap_or_default()`, `#[derive(Default)]`, struct update syntax `..Default::default()`, and generic code that requires `T: Default`. Implementing it makes your types more ergonomic.

## Bad

```rust
struct Config {
    timeout: Duration,
    retries: u32,
    verbose: bool,
}

impl Config {
    // Custom constructor - works but non-standard
    fn new() -> Self {
        Config {
            timeout: Duration::from_secs(30),
            retries: 3,
            verbose: false,
        }
    }
}

// Can't use with standard patterns
let config: Config = Default::default();  // Error: Default not implemented
let timeout = settings.get("timeout").unwrap_or_default();  // Won't work
```

## Good

```rust
use std::time::Duration;
// Derived default: zero/false values
#[derive(Default)]
struct Config {
    retries: u32,
    verbose: bool,
}

// Non-zero defaults need a hand-written impl
struct Client {
    timeout: Duration,
}

impl Default for Client {
    fn default() -> Self {
        Client { timeout: Duration::from_secs(30) }
    }
}

fn main() {
    let config = Config::default();
    let updated = Config { retries: 5, ..Default::default() };
    let client = Client::default();
    let _ = (config, updated, client);
}
```

## See Also

- [rust-api-builder-pattern](api-builder-pattern.md) - Building complex types
- [rust-api-common-traits](api-common-traits.md) - Other common traits to implement
- [rust-api-from-not-into](api-from-not-into.md) - Conversion traits
