---
id: rust-err-result-over-panic
lang: rust
prefix: err
title: "Return `Result<T, E>` instead of panicking for recoverable errors"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["result", "panic", "return", "panicking", "recoverable", "errors"]
  files: ["**/*.rs"]
  symbols: ["Result"]
related: ["rust-err-thiserror-lib", "rust-err-anyhow-app", "rust-err-no-unwrap-prod", "rust-anti-unwrap-abuse"]
sources:
  - title: "rust-skills: err-result-over-panic"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/err-result-over-panic.md
---
> Return `Result<T, E>` instead of panicking for recoverable errors

## Why

Panics unwind the stack and crash the thread (or program). They're unrecoverable from the caller's perspective. `Result<T, E>` gives callers the ability to decide how to handle errors—retry, fallback, propagate, or log. Libraries should almost never panic; applications should minimize panics to truly unrecoverable situations.

## Bad

```rust
#[derive(serde::Deserialize)]
struct Config;

fn parse_config(path: &str) -> Config {
    let content = std::fs::read_to_string(path)
        .expect("Failed to read config");  // Crashes on missing file
    
    serde_json::from_str(&content)
        .expect("Invalid config format")   // Crashes on bad JSON
}

fn divide(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("Division by zero!");  // Crashes the program
    }
    a / b
}

// Caller has no chance to recover or provide a fallback.
```

## Good

```rust
use thiserror::Error;

#[derive(Default, serde::Deserialize)]
struct Config;
#[derive(Error, Debug)]
enum ConfigError {
    #[error("failed to read config: {0}")]
    Io(#[from] std::io::Error),
    #[error("invalid config format: {0}")]
    Parse(#[from] serde_json::Error),
}

fn parse_config(path: &str) -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&content)?)
}

fn divide(a: i32, b: i32) -> Result<i32, &'static str> {
    if b == 0 { return Err("division by zero"); }
    Ok(a / b)
}

fn main() {
    let _config = parse_config("app.json").unwrap_or_default();
}
```

## See Also

- [rust-err-thiserror-lib](err-thiserror-lib.md) - Define error types for libraries
- [rust-err-anyhow-app](err-anyhow-app.md) - Ergonomic errors for applications
- [rust-err-no-unwrap-prod](err-no-unwrap-prod.md) - Avoid unwrap in production code
- [rust-anti-unwrap-abuse](anti-unwrap-abuse.md) - When unwrap is acceptable
