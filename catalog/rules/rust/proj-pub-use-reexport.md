---
id: rust-proj-pub-use-reexport
lang: rust
prefix: proj
title: "Use pub use for clean public API"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["pub", "reexport", "clean", "public", "api"]
  files: ["**/*.rs"]
related: ["rust-proj-prelude-module", "rust-proj-pub-crate-internal", "rust-api-non-exhaustive"]
sources:
  - title: "rust-skills: proj-pub-use-reexport"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/proj-pub-use-reexport.md
---
> Use pub use for clean public API

## Why

`pub use` re-exports items from submodules at the current module level. This creates a flat, ergonomic public API while keeping internal organization flexible. Users import from one place; you can reorganize internals without breaking their code.

## Bad

```rust
// lib.rs - Deep module paths exposed
pub mod error {
    pub struct MyError;
}
pub mod config {
    pub struct Config;
}
pub mod client {
    pub mod http {
        pub struct HttpClient;
    }
}
pub mod types {
    pub mod request {
        pub struct Request;
    }
}

// Users must write:
use crate::error::MyError;
use crate::config::Config;
use crate::client::http::HttpClient;
use crate::types::request::Request;
```

## Good

```rust
// lib.rs - Flat public API
mod error {
    pub struct MyError;
}
mod config {
    pub struct Config;
}
mod client {
    pub mod http {
        pub struct HttpClient;
    }
}
mod types { pub mod request { pub struct Request; } }

pub use error::MyError;
pub use config::Config;
pub use client::http::HttpClient;
pub use types::request::Request;

// Users write:
mod users {
    use crate::{Config, HttpClient, MyError, Request};
}
```

## See Also

- [rust-proj-prelude-module](proj-prelude-module.md) - Prelude pattern
- [rust-proj-pub-crate-internal](proj-pub-crate-internal.md) - Internal visibility
- [rust-api-non-exhaustive](api-non-exhaustive.md) - API stability
