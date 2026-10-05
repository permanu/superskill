---
id: rust-type-generic-bounds
lang: rust
prefix: type
title: "Add trait bounds only where needed, prefer where clauses for readability"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["generic", "bounds", "add", "trait", "clauses", "readability"]
  files: ["**/*.rs"]
related: ["rust-api-impl-into", "rust-api-impl-asref", "rust-name-type-param-single", "rust-trait-dyn-vs-generic", "rust-trait-associated-type-vs-generic"]
sources:
  - title: "rust-skills: type-generic-bounds"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/type-generic-bounds.md
---
> Add trait bounds only where needed, prefer where clauses for readability

## Why

Trait bounds constrain what types can be used with generic code. Adding unnecessary bounds limits flexibility. Adding bounds in the right place (impl vs function vs where clause) affects usability and readability. Well-placed bounds keep APIs flexible while ensuring type safety.

## Bad

```rust
use std::error::Error;

// Bounds on struct definition - limits all uses
struct Container<T: Clone + std::fmt::Debug> {  // Even storage requires Clone?
    items: Vec<T>,
}

// Inline bounds make signature hard to read
fn process<T: Clone + std::fmt::Debug + Send + Sync + 'static, E: Error + Send + Clone>(
    value: T
) -> Result<T, E> { Ok(value) }

// Redundant bounds
fn print_twice<T: Clone + std::fmt::Debug>(value: T)
where
    T: Clone,  // Already specified above
{
    println!("{:?}", value);
    println!("{:?}", value);
}
```

## Good

```rust
use std::error::Error;
// No bounds on struct - store anything
struct Container<T> {
    items: Vec<T>,
}

// Bounds only on impls that need them
impl<T: Clone> Container<T> {
    fn duplicate(&self) -> Self {
        Container { items: self.items.clone() }
    }
}

impl<T: std::fmt::Debug> Container<T> {
    fn debug_print(&self) {
        println!("{:?}", self.items);
    }
}

// Where clause for readability
fn process<T, E>(value: T) -> Result<T, E>
where
    T: Clone + std::fmt::Debug + Send + Sync + 'static,
    E: Error + Send + Clone,
{ Ok(value) }
```

## See Also

- [rust-api-impl-into](api-impl-into.md) - Using Into bounds
- [rust-api-impl-asref](api-impl-asref.md) - Using AsRef bounds
- [rust-name-type-param-single](name-type-param-single.md) - Type parameter naming
- [rust-trait-dyn-vs-generic](trait-dyn-vs-generic.md) - Static vs dynamic dispatch
- [rust-trait-associated-type-vs-generic](trait-associated-type-vs-generic.md) - Associated types vs generics
