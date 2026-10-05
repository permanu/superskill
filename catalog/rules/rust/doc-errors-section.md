---
id: rust-doc-errors-section
lang: rust
prefix: doc
title: "Include `# Errors` section for fallible functions"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["errors", "section", "include", "fallible", "functions"]
  files: ["**/*.rs"]
related: ["rust-doc-panics-section", "rust-err-doc-errors", "rust-doc-intra-links"]
sources:
  - title: "rust-skills: doc-errors-section"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/doc-errors-section.md
---
> Include `# Errors` section for fallible functions

## Why

Functions returning `Result` can fail in specific, documented ways. The `# Errors` section tells users when and why the function can fail, so callers can handle those failures without reading the source code.

This is especially critical for library code where users cannot easily inspect implementation details.

## Bad

```rust
use std::path::Path;

pub struct Error;
pub struct Connection;
pub struct DbError;

/// Opens a file and reads its contents.
pub fn read_file(path: &Path) -> Result<String, Error> {
    // Users have no idea what errors to expect
    let _ = path;
    Err(Error)
}

/// Connects to the database.
pub async fn connect(url: &str) -> Result<Connection, DbError> {
    // Multiple failure modes, none documented
    let _ = url;
    Err(DbError)
}
```

## Good

```rust
use std::path::Path;

pub struct Error;
pub struct Connection;
pub struct DbError;

/// Opens a file and reads its contents as a UTF-8 string.
///
/// # Errors
///
/// Returns [`Error::NotFound`], [`Error::PermissionDenied`], or
/// [`Error::InvalidUtf8`].
pub fn read_file(path: &Path) -> Result<String, Error> {
    let _ = path;
    Err(Error)
}
/// Connects to the database.
///
/// # Errors
///
/// Returns [`DbError::InvalidUrl`] or [`DbError::ConnectionFailed`].
pub async fn connect(url: &str) -> Result<Connection, DbError> {
    let _ = url;
    Err(DbError)
}
```

## See Also

- [rust-doc-panics-section](doc-panics-section.md) - Documenting panics
- [rust-err-doc-errors](err-doc-errors.md) - Error documentation patterns
- [rust-doc-intra-links](doc-intra-links.md) - Linking to types
