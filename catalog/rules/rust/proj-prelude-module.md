---
id: rust-proj-prelude-module
lang: rust
prefix: proj
title: "Create prelude module for common imports"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["prelude", "module", "create", "common", "imports"]
  files: ["**/*.rs"]
related: ["rust-proj-pub-use-reexport", "rust-api-extension-trait", "rust-doc-module-inner"]
sources:
  - title: "rust-skills: proj-prelude-module"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/proj-prelude-module.md
---
> Create prelude module for common imports

## Why

A `prelude` module collects the most commonly used types and traits for glob import. Users write `use my_crate::prelude::*` instead of many individual imports. This follows the pattern established by `std::prelude`.

## Bad

```rust
mod my_crate {
    pub struct Client;
    pub struct Config;
    pub struct Error;
    pub struct Request;
    pub struct Response;

    pub mod traits {
        pub struct Handler;
        pub struct Middleware;
    }

    pub mod types { pub struct Method; }
}

// Users must import everything individually
use my_crate::Client;
use my_crate::Config;
use my_crate::Error;
use my_crate::Request;
use my_crate::Response;
use my_crate::traits::Handler;
use my_crate::traits::Middleware;
use my_crate::types::Method;
```

## Good

```rust
// src/lib.rs
pub struct Client;
pub struct Config;
pub struct Error;
pub struct Request;
pub struct Response;

pub mod traits {
    pub struct Handler;
    pub struct Middleware;
}

pub mod types { pub struct Method; }

pub mod prelude {
    pub use crate::traits::{Handler, Middleware};
    pub use crate::types::Method;
    pub use crate::{Client, Config, Error, Request, Response};
}

// Users write:
mod users {
    use crate::prelude::*;
}
```

## See Also

- [rust-proj-pub-use-reexport](proj-pub-use-reexport.md) - Re-export patterns
- [rust-api-extension-trait](api-extension-trait.md) - Extension traits
- [rust-doc-module-inner](doc-module-inner.md) - Module documentation
