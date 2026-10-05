---
id: rust-api-non-exhaustive
lang: rust
prefix: api
title: "Use `#[non_exhaustive]` on public enums and structs for forward compatibility"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["non", "exhaustive", "non_exhaustive", "public", "enums", "structs", "forward", "compatibility"]
  files: ["**/*.rs"]
  symbols: ["non_exhaustive"]
related: ["rust-api-sealed-trait", "rust-err-custom-type", "rust-api-builder-pattern"]
sources:
  - title: "rust-skills: api-non-exhaustive"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-non-exhaustive.md
---
> Use `#[non_exhaustive]` on public enums and structs for forward compatibility

## Why

Adding a variant to a public enum or a field to a public struct is normally a breaking change—downstream code may match exhaustively or use struct literal syntax. `#[non_exhaustive]` forces external code to use wildcards in matches and constructors, allowing you to add variants/fields in minor versions without breaking callers.

## Bad

```rust
// Public enum - adding a variant breaks downstream matches
pub enum ErrorKind {
    NotFound,
    PermissionDenied,
    TimedOut,
}

pub struct Config {
    pub name: String,
    pub value: i32,
}

fn main() {
    let kind = ErrorKind::NotFound;
    match kind {
        ErrorKind::NotFound => {}
        ErrorKind::PermissionDenied => {}
        ErrorKind::TimedOut => {}
        // No wildcard - breaks when ErrorKind::Interrupted is added
    }

    // Downstream construction breaks when a field is added
    let config = Config { name: "test".into(), value: 42 };
    let _ = config;
}
```

## Good

```rust
#[non_exhaustive]
pub enum ErrorKind { NotFound, PermissionDenied, TimedOut }

#[non_exhaustive]
pub struct Config { pub name: String, pub value: i32 }

impl Config {
    pub fn new(name: impl Into<String>, value: i32) -> Self {
        Config { name: name.into(), value }
    }
}

fn main() {
    // Wildcard arm is required for external matches
    match ErrorKind::NotFound {
        ErrorKind::NotFound => {}
        ErrorKind::PermissionDenied => {}
        ErrorKind::TimedOut => {}
        _ => {}
    }
    // Struct literal is forbidden; use the constructor
    let _ = Config::new("test", 42);
}
```

## See Also

- [rust-api-sealed-trait](api-sealed-trait.md) - Controlling trait implementations
- [rust-err-custom-type](err-custom-type.md) - Error type design
- [rust-api-builder-pattern](api-builder-pattern.md) - Alternative to struct literals
