---
id: rust-err-doc-errors
lang: rust
prefix: err
title: "Document error conditions with `# Errors` section in doc comments"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["doc", "errors", "document", "error", "conditions", "section", "comments"]
  files: ["**/*.rs"]
related: ["rust-doc-examples-section", "rust-err-thiserror-lib", "rust-api-must-use"]
sources:
  - title: "rust-skills: err-doc-errors"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/err-doc-errors.md
---
> Document error conditions with `# Errors` section in doc comments

## Why

Users of your API need to know what can go wrong and why. The `# Errors` documentation section is the standard Rust convention for describing when a function returns `Err`. Good error documentation helps callers handle errors appropriately and understand the contract of your API.

## Bad

```rust
use std::path::Path;

#[derive(Debug)] pub struct Config;
#[derive(Debug)] pub struct Value;
#[derive(Debug)] pub struct ConfigError;
#[derive(Debug)] pub struct ParseError;

/// Loads a configuration from the specified path.
pub fn load_config(path: &Path) -> Result<Config, ConfigError> {
    // No documentation of error conditions
    // Caller must read source code to understand what can fail
    let _ = path;
    Err(ConfigError)
}

/// Parses and validates the input string.
///
/// Returns the parsed value.  // What about errors?
pub fn parse_input(input: &str) -> Result<Value, ParseError> {
    let _ = input;
    Err(ParseError)
}
```

## Good

```rust
use std::path::Path;

pub struct Config;
pub struct ConfigError;
pub struct ParseError;

/// Loads a configuration from the specified path.
///
/// # Errors
///
/// Returns an error if the file cannot be read or parsed.
pub fn load_config(path: &Path) -> Result<Config, ConfigError> {
    let _ = path;
    Err(ConfigError)
}

/// Parses and validates the input as a positive integer.
///
/// # Errors
///
/// Returns [`ParseError::Empty`] if the input is empty, or [`ParseError::Overflow`] if the value exceeds `i64::MAX`.
pub fn parse_positive_int(input: &str) -> Result<i64, ParseError> {
    let _ = input;
    Err(ParseError)
}
```

## See Also

- [rust-doc-examples-section](doc-examples-section.md) - Examples in documentation
- [rust-err-thiserror-lib](err-thiserror-lib.md) - Defining error types
- [rust-api-must-use](api-must-use.md) - Marking Results as must_use
