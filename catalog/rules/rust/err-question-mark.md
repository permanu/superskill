---
id: rust-err-question-mark
lang: rust
prefix: err
title: "Use `?` operator for clean propagation"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["question", "mark", "operator", "clean", "propagation"]
  files: ["**/*.rs"]
related: ["rust-err-context-chain", "rust-err-from-impl", "rust-err-anyhow-app"]
sources:
  - title: "rust-skills: err-question-mark"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/err-question-mark.md
---
> Use `?` operator for clean propagation

## Why

The `?` operator is Rust's idiomatic way to propagate errors. It's concise, readable, and automatically converts between compatible error types using `From`. It replaces verbose `match` or `unwrap()` calls.

## Bad

```rust
#[derive(serde::Deserialize)]
struct Config;

enum Error { Io(std::io::Error), Parse(toml::de::Error) }

impl From<std::io::Error> for Error { fn from(e: std::io::Error) -> Self { Error::Io(e) } }
impl From<toml::de::Error> for Error { fn from(e: toml::de::Error) -> Self { Error::Parse(e) } }

// Verbose match-based error handling
fn load_config() -> Result<Config, Error> {
    let content = match std::fs::read_to_string("config.toml") {
        Ok(c) => c,
        Err(e) => return Err(Error::Io(e)),
    };
    let config = match toml::from_str(&content) {
        Ok(c) => c,
        Err(e) => return Err(Error::Parse(e)),
    };
    Ok(config)
}

// Or worse - unwrap panics on any error
fn load_config_bad() -> Config {
    toml::from_str(&std::fs::read_to_string("config.toml").unwrap()).unwrap()
}
```

## Good

```rust
#[derive(serde::Deserialize)]
struct Config;

enum Error { Io(std::io::Error), Parse(toml::de::Error) }

impl From<std::io::Error> for Error {
    fn from(e: std::io::Error) -> Self { Error::Io(e) }
}
impl From<toml::de::Error> for Error {
    fn from(e: toml::de::Error) -> Self { Error::Parse(e) }
}

fn load_config() -> Result<Config, Error> {
    let content = std::fs::read_to_string("config.toml")?;
    let config = toml::from_str(&content)?;
    Ok(config)
}

// Even more concise
mod concise {
    use super::*;
    fn load_config() -> Result<Config, Error> {
        Ok(toml::from_str(&std::fs::read_to_string("config.toml")?)?)
    }
}
```

## See Also

- [rust-err-context-chain](err-context-chain.md) - Add context with .context()
- [rust-err-from-impl](err-from-impl.md) - Use #[from] for automatic conversion
- [rust-err-anyhow-app](err-anyhow-app.md) - Use anyhow for applications
