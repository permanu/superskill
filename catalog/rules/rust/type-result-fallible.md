---
id: rust-type-result-fallible
lang: rust
prefix: type
title: "Use `Result<T, E>` for operations that can fail"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["result", "fallible", "operations", "fail"]
  files: ["**/*.rs"]
  symbols: ["Result"]
related: ["rust-err-thiserror-lib", "rust-err-question-mark", "rust-type-option-nullable"]
sources:
  - title: "rust-skills: type-result-fallible"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/type-result-fallible.md
---
> Use `Result<T, E>` for operations that can fail

## Why

`Result<T, E>` makes failure explicit in the type system. Callers must acknowledge and handle potential errors—they can't accidentally ignore failures. The `?` operator makes error propagation ergonomic while maintaining explicit error handling.

## Bad

```rust
#[derive(serde::Deserialize)]
struct Config;

// Returning Option loses error context
fn read_config(path: &str) -> Option<Config> {
    let content = std::fs::read_to_string(path).ok()?;  // Why did it fail?
    toml::from_str(&content).ok()  // Parse error lost
}

// Panicking on errors
fn read_config_unwrap(path: &str) -> Config {
    let content = std::fs::read_to_string(path).unwrap();  // Crashes
    toml::from_str(&content).unwrap()  // Crashes
}

// Sentinel values
fn divide(a: i32, b: i32) -> i32 {
    if b == 0 { return -1; }  // Magic value, easy to miss
    a / b
}
```

## Good

```rust
#[derive(serde::Deserialize)]
struct Config;

#[derive(Debug, thiserror::Error)]
enum ConfigError {
    #[error("io: {0}")] Io(#[from] std::io::Error),
    #[error("parse: {0}")] Parse(#[from] toml::de::Error),
}

#[derive(Debug, thiserror::Error)]
#[error("division by zero")]
struct DivisionError;

fn read_config(path: &str) -> Result<Config, ConfigError> {
    Ok(toml::from_str(&std::fs::read_to_string(path)?)?)
}

fn divide(a: i32, b: i32) -> Result<i32, DivisionError> {
    if b == 0 { Err(DivisionError) } else { Ok(a / b) }
}

fn main() {
    let e = divide(10, 0).unwrap_err();  // Caller must handle
    println!("Error: {e}");
}
```

## See Also

- [rust-err-thiserror-lib](err-thiserror-lib.md) - Defining error types
- [rust-err-question-mark](err-question-mark.md) - Using ? operator
- [rust-type-option-nullable](type-option-nullable.md) - Option vs Result
