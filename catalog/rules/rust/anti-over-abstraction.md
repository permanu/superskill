---
id: rust-anti-over-abstraction
lang: rust
prefix: anti
title: "Don't over-abstract with excessive generics"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["abstraction", "don", "over-abstract", "excessive", "generics"]
  files: ["**/*.rs"]
related: ["rust-type-generic-bounds", "rust-api-sealed-trait", "rust-anti-type-erasure"]
sources:
  - title: "rust-skills: anti-over-abstraction"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-over-abstraction.md
---
> Don't over-abstract with excessive generics

## Why

Generics and traits are powerful but come at a cost: compile times, binary size, and cognitive load. Over-abstraction—making everything generic "for flexibility"—adds complexity without benefit. Start concrete; generalize when you have real use cases.

## Bad

```rust
// Overly generic for a simple function
fn add<T, U, R>(a: T, b: U) -> R
where
    T: Into<R>,
    U: Into<R>,
    R: std::ops::Add<Output = R>,
{
    a.into() + b.into()
}

// Trait explosion
trait Readable {}
trait Writable {}
trait ReadWritable: Readable + Writable {}
trait AsyncReadable {}
trait AsyncWritable {}
trait AsyncReadWritable: AsyncReadable + AsyncWritable {}

// Abstract factory pattern (Java flashback)
trait Factory<T> {
    fn create(&self) -> T;
}
trait FactoryFactory<F: Factory<T>, T> {
    fn create_factory(&self) -> F;
}
```

## Good

```rust
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug)]
struct Error;

// Concrete implementation - clear and simple
fn add_i32(a: i32, b: i32) -> i32 {
    a + b
}

// Generic when actually needed (e.g., library code)
fn add<T: std::ops::Add<Output = T>>(a: T, b: T) -> T {
    a + b
}

// Simple traits for actual polymorphism needs
trait Storage {
    fn save(&self, key: &str, value: &[u8]) -> Result<(), Error>;
    fn load(&self, key: &str) -> Result<Vec<u8>, Error>;
}

// Concrete types first
struct FileStorage { path: PathBuf }
struct MemoryStorage { data: HashMap<String, Vec<u8>> }
```

## See Also

- [rust-type-generic-bounds](type-generic-bounds.md) - Minimal bounds
- [rust-api-sealed-trait](api-sealed-trait.md) - Controlled extension
- [rust-anti-type-erasure](anti-type-erasure.md) - When Box<dyn> is wrong
