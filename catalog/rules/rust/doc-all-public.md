---
id: rust-doc-all-public
lang: rust
prefix: doc
title: "Document all public items with `///` doc comments"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["public", "document", "items", "doc", "comments"]
  files: ["**/*.rs"]
related: ["rust-doc-module-inner", "rust-doc-examples-section", "rust-lint-missing-docs"]
sources:
  - title: "rust-skills: doc-all-public"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/doc-all-public.md
---
> Document all public items with `///` doc comments

## Why

Public items define your crate's API contract. Without documentation, users must read source code to understand how to use your library. Well-documented APIs reduce support burden, improve adoption, and serve as the primary reference for users.

Rust's `cargo doc` generates beautiful HTML documentation from doc comments, but only if you write them.

## Bad

```rust
use std::time::Duration;

pub struct Connection;
pub struct Error;

pub struct Config {
    pub timeout: Duration,
    pub retries: u32,
    pub base_url: String,
}

pub fn connect(config: Config) -> Result<Connection, Error> {
    let _ = config;
    Err(Error)
}

pub enum Status {
    Pending,
    Active,
    Failed,
}
```

## Good

```rust
use std::time::Duration;
pub struct Connection;
pub struct Error;
/// Configuration for establishing a connection to the service.
pub struct Config {
    /// Maximum time to wait for a response before timing out.
    pub timeout: Duration,
    /// Number of retry attempts for failed requests.
    pub retries: u32,
}

/// Establishes a connection using the provided configuration.
/// Returns [`Error`] if the connection cannot be established.
pub fn connect(config: Config) -> Result<Connection, Error> {
    let _ = config;
    Err(Error)
}

/// Represents the current status of a job.
pub enum Status {
    /// Job is waiting to be processed.
    Pending,
    /// Job is currently being processed.
    Active,
}
```

## See Also

- [rust-doc-module-inner](doc-module-inner.md) - Module-level documentation
- [rust-doc-examples-section](doc-examples-section.md) - Adding examples
- [rust-lint-missing-docs](lint-missing-docs.md) - Enforcing documentation
