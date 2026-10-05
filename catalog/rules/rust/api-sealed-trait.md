---
id: rust-api-sealed-trait
lang: rust
prefix: api
title: "Use sealed traits to prevent external implementations while allowing use"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["sealed", "trait", "traits", "prevent", "external", "implementations", "while", "allowing"]
  files: ["**/*.rs"]
related: ["rust-api-non-exhaustive", "rust-api-extension-trait", "rust-api-typestate"]
sources:
  - title: "rust-skills: api-sealed-trait"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-sealed-trait.md
---
> Use sealed traits to prevent external implementations while allowing use

## Why

Public traits can be implemented by anyone, which may be undesirable when you need to guarantee behavior or add methods in future versions. A sealed trait can be used by external code but not implemented by it, giving you control over implementations while maintaining a usable API.

## Bad

```rust
pub trait DatabaseDriver {
    fn connect(&self, url: &str) -> Connection;
    fn execute(&self, query: &str) -> Result<Rows, Error>;
}

pub struct Connection;
pub struct Rows;
pub struct Error;

fn force_connect(_url: &str) -> Connection { Connection }

struct MyBadDriver;

// Any crate can implement the trait however it likes.
impl DatabaseDriver for MyBadDriver {
    fn connect(&self, url: &str) -> Connection {
        unsafe { force_connect(url) }
    }
    fn execute(&self, _query: &str) -> Result<Rows, Error> { Err(Error) }
}

// Later, adding a required method here is a BREAKING CHANGE
// for every external implementation.
```

## Good

```rust
pub struct Connection;
pub struct Rows;
pub struct Error;

// Private module: `Sealed` cannot be named outside this crate.
mod private {
    pub trait Sealed {}
}

// Public trait requires it, so only this crate can implement.
pub trait DatabaseDriver: private::Sealed {
    fn connect(&self, url: &str) -> Connection;
    fn execute(&self, query: &str) -> Result<Rows, Error>;
}

pub struct PostgresDriver;
impl private::Sealed for PostgresDriver {}
impl DatabaseDriver for PostgresDriver {
    fn connect(&self, _url: &str) -> Connection { Connection }
    fn execute(&self, _query: &str) -> Result<Rows, Error> { Ok(Rows) }
}

// External code can use the trait, but cannot implement it.
fn use_driver(driver: &impl DatabaseDriver) { let _ = driver.connect("postgres://localhost"); }
```

## See Also

- [rust-api-non-exhaustive](api-non-exhaustive.md) - Related pattern for enums/structs
- [rust-api-extension-trait](api-extension-trait.md) - Adding methods to external types
- [rust-api-typestate](api-typestate.md) - Compile-time state guarantees
