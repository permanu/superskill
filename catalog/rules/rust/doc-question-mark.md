---
id: rust-doc-question-mark
lang: rust
prefix: doc
title: "Use `?` in examples, not `.unwrap()`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["question", "mark", "examples", "unwrap"]
  files: ["**/*.rs"]
related: ["rust-doc-examples-section", "rust-doc-hidden-setup", "rust-err-question-mark"]
sources:
  - title: "rust-skills: doc-question-mark"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/doc-question-mark.md
---
> Use `?` in examples, not `.unwrap()`

## Why

Doc examples should model best practices. Using `.unwrap()` teaches users to ignore errors, while `?` demonstrates proper error propagation. Examples with `?` also fail the doctest if an error occurs, catching bugs in documentation.

Rust doctests wrap examples in a function that returns `Result<(), E>` by default when you use `?`, making this pattern easy to adopt.

## Bad

```rust
pub struct Config {
    pub database_url: String,
}
pub struct Error;

/// Reads a configuration file.
///
/// # Examples
///
/// ```
/// let config = Config::from_file("config.toml").unwrap();
/// println!("{:?}", config.database_url);
/// ```
pub fn from_file(path: &str) -> Result<Config, Error> {
    let _ = path;
    Err(Error)
}
```

## Good

```rust
pub struct Config {
    pub database_url: String,
}
pub struct Error;

/// Reads a configuration file.
///
/// # Examples
///
/// ```
/// # use my_crate::{Config, Error};
/// # fn main() -> Result<(), Error> {
/// let config = Config::from_file("config.toml")?;
/// println!("{:?}", config.database_url);
/// # Ok(())
/// # }
/// ```
pub fn from_file(path: &str) -> Result<Config, Error> {
    let _ = path;
    Err(Error)
}
```

## See Also

- [rust-doc-examples-section](doc-examples-section.md) - Writing examples
- [rust-doc-hidden-setup](doc-hidden-setup.md) - Hiding setup code
- [rust-err-question-mark](err-question-mark.md) - Error propagation
