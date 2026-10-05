---
id: rust-lint-missing-docs
lang: rust
prefix: lint
title: "Warn on missing documentation for public items"
severity: should
enforce: tool
tool: rustc::missing_docs
baseline: latest
status: verified
triggers:
  keywords: ["missing", "docs", "warn", "documentation", "public", "items"]
  files: ["**/*.rs"]
related: ["rust-doc-all-public", "rust-lint-unsafe-doc", "rust-doc-examples-section"]
sources:
  - title: "rust-skills: lint-missing-docs"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/lint-missing-docs.md
---
> Warn on missing documentation for public items

## Why

The `missing_docs` lint ensures all public API items are documented. For libraries, documentation IS the user interface. Missing docs mean users can't understand your API without reading source code.

## Bad

```rust
#![warn(missing_docs)]

pub struct User {  // WARN: missing documentation for a struct
    pub name: String,  // WARN: missing documentation for a field
    pub age: u32,      // WARN: missing documentation for a field
}

pub fn process() { }  // WARN: missing documentation for a function

pub trait Handler {  // WARN: missing documentation for a trait
    fn handle(&self);  // WARN: missing documentation for a method
}
```

## Good

```rust
#![warn(missing_docs)]

//! User management module.
/// Represents a registered user in the system.
pub struct User {
    /// The user's display name.
    pub name: String,
    /// The user's age in years.
    pub age: u32,
}

/// Processes pending user requests.
///
/// # Examples
///
/// ```
/// process();
/// ```
pub fn process() { }

/// Handler trait for request processing.
pub trait Handler {
    /// Handle an incoming request.
    fn handle(&self);
}
```

## See Also

- [rust-doc-all-public](doc-all-public.md) - Documentation patterns
- [rust-lint-unsafe-doc](lint-unsafe-doc.md) - Unsafe documentation
- [rust-doc-examples-section](doc-examples-section.md) - Adding examples
