---
id: rust-err-anyhow-app
lang: rust
prefix: err
title: "Use `anyhow` for application error handling"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["anyhow", "app", "application", "error", "handling"]
  files: ["**/*.rs"]
  symbols: ["anyhow"]
related: ["rust-err-thiserror-lib", "rust-err-context-chain"]
sources:
  - title: "rust-skills: err-anyhow-app"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/err-anyhow-app.md
---
> Use `anyhow` for application error handling

## Why

Applications need to report what went wrong with good context, not to model every failure as a typed enum. `anyhow` provides easy error handling with context chaining, backtraces, and conversion from any error type.

## Bad

```rust
use std::error::Error;

#[derive(serde::Deserialize)]
struct Config;

#[derive(Debug)]
struct FixtureError(&'static str);
impl std::fmt::Display for FixtureError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result { write!(f, "{}", self.0) }
}
impl Error for FixtureError {}
type FindError = FixtureError;
type ValidationError = FixtureError;

fn find_config() -> Result<String, FindError> { Ok("config.toml".to_string()) }
fn validate(_config: &Config) -> Result<(), ValidationError> { Ok(()) }

// Tedious type management, and no context on failure
fn load_config() -> Result<Config, Box<dyn std::error::Error>> {
    let path = find_config()?;
    let content = std::fs::read_to_string(&path)?;  // io::Error
    let config: Config = toml::from_str(&content)?;  // toml::Error
    validate(&config)?;                              // ValidationError
    Ok(config)
}
```

## Good

```rust
use anyhow::{Context, Result};

#[derive(serde::Deserialize)]
struct Config;

#[derive(Debug)]
struct FindError;
impl std::fmt::Display for FindError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result { write!(f, "config not found") }
}
impl std::error::Error for FindError {}

fn find_config() -> std::result::Result<String, FindError> { Ok("config.toml".to_string()) }
fn validate(_config: &Config) -> std::result::Result<(), FindError> { Ok(()) }

fn load_config() -> Result<Config> {
    let path = find_config().context("failed to locate config file")?;
    let content = std::fs::read_to_string(&path)
        .with_context(|| format!("failed to read config from {}", path))?;
    let config: Config = toml::from_str(&content).context("failed to parse config as TOML")?;
    validate(&config).context("config validation failed")?;
    Ok(config)
}
```

## See Also

- [rust-err-thiserror-lib](err-thiserror-lib.md) - Use thiserror for libraries
- [rust-err-context-chain](err-context-chain.md) - Add context to errors
