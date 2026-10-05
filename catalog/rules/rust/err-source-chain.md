---
id: rust-err-source-chain
lang: rust
prefix: err
title: "Preserve error chains with `#[source]` or `source()` method"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["source", "chain", "preserve", "error", "chains", "method"]
  files: ["**/*.rs"]
  symbols: ["source"]
related: ["rust-err-thiserror-lib", "rust-err-context-chain", "rust-err-from-impl"]
sources:
  - title: "rust-skills: err-source-chain"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/err-source-chain.md
---
> Preserve error chains with `#[source]` or `source()` method

## Why

Errors have underlying causes. Preserving the error chain (via `source()` method) allows logging frameworks and error reporters to show the full context: "config parse failed → JSON syntax error at line 5 → unexpected token". Without chaining, you lose valuable debugging information.

## Bad

```rust
#[derive(serde::Deserialize)]
struct Config;

#[derive(Debug)]
enum ConfigError {
    ParseFailed(String),  // Lost the original serde_json::Error
}

fn load_config(path: &str) -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| ConfigError::ParseFailed(e.to_string()))?;  // Chain lost!
    
    let config: Config = serde_json::from_str(&content)
        .map_err(|e| ConfigError::ParseFailed(e.to_string()))?;  // No source
    Ok(config)
}

// Error output: "Parse failed: invalid type: expected string"
// Missing: which file? what line? what was the parent error?
```

## Good

```rust
use thiserror::Error;

#[derive(serde::Deserialize)]
struct Config;

#[derive(Error, Debug)]
enum ConfigError {
    #[error("failed to read config")]
    ReadFailed(#[source] std::io::Error),
    #[error("failed to parse config")]
    ParseFailed(#[source] serde_json::Error),
}

fn load_config(path: &str) -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string(path).map_err(ConfigError::ReadFailed)?;
    let config: Config = serde_json::from_str(&content).map_err(ConfigError::ParseFailed)?;
    Ok(config)
}
```

## See Also

- [rust-err-thiserror-lib](err-thiserror-lib.md) - Thiserror for error definitions
- [rust-err-context-chain](err-context-chain.md) - Adding context to errors
- [rust-err-from-impl](err-from-impl.md) - From implementations for ?
