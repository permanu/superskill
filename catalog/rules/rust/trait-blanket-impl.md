---
id: rust-trait-blanket-impl
lang: rust
prefix: trait
title: "Use a blanket impl `impl<T: Bound> Trait for T` to give behaviour to every type that satisfies a bound"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["blanket", "impl", "bound", "trait", "give", "behaviour", "type", "satisfies"]
  files: ["**/*.rs"]
related: ["rust-api-extension-trait", "rust-api-sealed-trait", "rust-trait-coherence-newtype"]
sources:
  - title: "rust-skills: trait-blanket-impl"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/trait-blanket-impl.md
---
> Use a blanket impl `impl<T: Bound> Trait for T` to give behaviour to every type that satisfies a bound

## Why

A blanket impl extends an entire class of types at once without touching each one individually. The standard library uses this pervasively: `ToString` is blanket-implemented for every `T: Display`, so any type that implements `Display` automatically gets `.to_string()`. This avoids repetitive boilerplate and keeps extension traits composable. The trade-off is coherence: Rust's orphan rules allow at most one applicable impl per type, so a blanket impl can conflict with a more specific one if not designed carefully. Adding a blanket impl is also a **semver-breaking change** if it could overlap with impls that downstream crates provide.

## Bad

```rust
use std::fmt;

trait Describe {
    fn describe(&self) -> String;
}

// Manual impl for each type — tedious and doesn't scale.
impl Describe for i32 {
    fn describe(&self) -> String { format!("i32: {self}") }
}
impl Describe for f64 {
    fn describe(&self) -> String { format!("f64: {self}") }
}
impl Describe for bool {
    fn describe(&self) -> String { format!("bool: {self}") }
}
// Repeated by hand for every type that implements Display.
```

## Good

```rust
use std::fmt;

// Extension trait that any `Display` type receives automatically.
trait Describe {
    fn describe(&self) -> String;
}

// One blanket impl covers every T: Display — mirrors std's ToString.
impl<T: fmt::Display> Describe for T {
    fn describe(&self) -> String {
        format!("{} ({})", self, std::any::type_name::<T>())
    }
}

fn demo() {
    println!("{}", 42_i32.describe());
    println!("{}", 3.14_f64.describe());
    println!("{}", true.describe());
    println!("{}", "hello".describe());
}

// You cannot also write `impl Describe for MyType` for a specific type:
// it conflicts with the blanket impl (E0119). Use a newtype instead.
```

## See Also

- [rust-api-extension-trait](api-extension-trait.md) - Add methods to foreign types via extension traits
- [rust-api-sealed-trait](api-sealed-trait.md) - Prevent external implementations of a trait
- [rust-trait-coherence-newtype](trait-coherence-newtype.md) - Use a newtype to implement a foreign trait on a foreign type
