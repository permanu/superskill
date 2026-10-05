---
id: rust-doc-module-inner
lang: rust
prefix: doc
title: "Use `//!` for module-level documentation"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["module", "inner", "module-level", "documentation"]
  files: ["**/*.rs"]
related: ["rust-doc-all-public", "rust-doc-examples-section", "rust-doc-cargo-metadata"]
sources:
  - title: "rust-skills: doc-module-inner"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/doc-module-inner.md
---
> Use `//!` for module-level documentation

## Why

Inner doc comments (`//!`) document the module itself, not the next item. They appear at the top of module files and describe the module's purpose, contents, and usage patterns. This helps users understand what a module provides before diving into individual items.

Module docs are the first thing users see in `cargo doc` when navigating to a module.

## Bad

```rust
// This module handles authentication
// It provides JWT and session-based auth

mod auth {
    // auth.rs
    /// Authentication utilities  // Wrong: this documents nothing useful
    use std::collections::HashMap;

    pub struct Session;
}

pub use auth::*;
```

## Good

```rust
//! Authentication and authorization utilities.
//!
//! This module provides multiple authentication strategies:
//!
//! - [`JwtAuth`] - JSON Web Token based authentication
//! - [`SessionAuth`] - Cookie-based session authentication
//! - [`ApiKeyAuth`] - API key authentication for services
//!
//! # Examples
//!
//! ```
//! use my_crate::auth::{JwtAuth, Authenticator};
//!
//! let auth = JwtAuth::new("secret-key");
//! let token = auth.generate_token(&user)?;
//! ```
//!
//! # Feature Flags
//!
//! - `jwt` - Enables JWT authentication (enabled by default)
//! - `sessions` - Enables session-based authentication

use std::collections::HashMap;

pub struct Session;
```

## See Also

- [rust-doc-all-public](doc-all-public.md) - Documenting public items
- [rust-doc-examples-section](doc-examples-section.md) - Adding examples
- [rust-doc-cargo-metadata](doc-cargo-metadata.md) - Crate metadata
