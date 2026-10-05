---
id: rust-err-from-impl
lang: rust
prefix: err
title: "Implement `From<E>` for error conversions to enable `?` operator"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["impl", "implement", "error", "conversions", "enable", "operator"]
  files: ["**/*.rs"]
  symbols: ["From"]
related: ["rust-err-thiserror-lib", "rust-err-source-chain", "rust-err-question-mark", "rust-conv-tryfrom-fallible"]
sources:
  - title: "rust-skills: err-from-impl"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/err-from-impl.md
---
> Implement `From<E>` for error conversions to enable `?` operator

## Why

The `?` operator automatically converts errors using `From` trait. By implementing `From<SourceError> for YourError`, you enable seamless error propagation without explicit `.map_err()` calls. This makes error handling code cleaner and ensures consistent error wrapping throughout your codebase.

## Bad

```rust
#[derive(Debug)]
struct DbError;

#[derive(serde::Deserialize)]
struct Config;

fn save_to_db(_config: &Config) -> Result<(), DbError> { Ok(()) }

#[derive(Debug)]
enum AppError {
    Io(std::io::Error),
    Parse(serde_json::Error),
    Database(DbError),
}

fn load_config(path: &str) -> Result<Config, AppError> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| AppError::Io(e))?;  // Manual conversion everywhere
    let config: Config = serde_json::from_str(&content)
        .map_err(|e| AppError::Parse(e))?;  // Repeated boilerplate
    save_to_db(&config)
        .map_err(|e| AppError::Database(e))?;  // Gets tedious
    Ok(config)
}
```

## Good

```rust
#[derive(Debug)] struct DbError;
#[derive(serde::Deserialize)] struct Config;

fn save_to_db(_config: &Config) -> Result<(), DbError> { Ok(()) }

#[derive(Debug)]
enum AppError {
    Io(std::io::Error),
    Parse(serde_json::Error),
    Database(DbError),
}

// Implement From for each source error type
impl From<std::io::Error> for AppError { fn from(err: std::io::Error) -> Self { AppError::Io(err) } }
impl From<serde_json::Error> for AppError { fn from(err: serde_json::Error) -> Self { AppError::Parse(err) } }
impl From<DbError> for AppError { fn from(err: DbError) -> Self { AppError::Database(err) } }

fn load_config(path: &str) -> Result<Config, AppError> {
    let content = std::fs::read_to_string(path)?;  // Auto-converts
    let config: Config = serde_json::from_str(&content)?;
    save_to_db(&config)?;
    Ok(config)
}
```

## See Also

- [rust-err-thiserror-lib](err-thiserror-lib.md) - Using thiserror for libraries
- [rust-err-source-chain](err-source-chain.md) - Preserving error chains
- [rust-err-question-mark](err-question-mark.md) - The ? operator
- [rust-conv-tryfrom-fallible](conv-tryfrom-fallible.md) - TryFrom for fallible conversions
