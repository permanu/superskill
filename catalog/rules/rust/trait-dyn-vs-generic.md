---
id: rust-trait-dyn-vs-generic
lang: rust
prefix: trait
title: "Choose static dispatch (generics / `impl Trait`) vs dynamic dispatch (`dyn Trait`) deliberately"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["dyn", "generic", "choose", "static", "dispatch", "generics", "impl", "trait"]
  files: ["**/*.rs"]
related: ["rust-anti-type-erasure", "rust-type-generic-bounds", "rust-trait-object-safety"]
sources:
  - title: "rust-skills: trait-dyn-vs-generic"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/trait-dyn-vs-generic.md
---
> Choose static dispatch (generics / `impl Trait`) vs dynamic dispatch (`dyn Trait`) deliberately

## Why

Generic bounds and `impl Trait` monomorphize at compile time: each concrete type gets its own specialised copy that the compiler can inline and optimise, but every distinct type adds to binary size. `dyn Trait` stores a fat pointer (data + vtable) and dispatches at runtime, producing a single code path — necessary when you must store heterogeneous values or return erased types, at the cost of one pointer indirection per call. Choosing the wrong option either leaves performance on the table or prevents heterogeneous collections entirely. Default to generics for hot, simple code; reach for `dyn` when you need flexibility, heap storage, or cross-crate plug-ins.

## Bad

```rust
// Using `dyn` everywhere "to be flexible" — blocks inlining and
// forces heap allocation even for single, known types.
trait Shape {
    fn area(&self) -> f64;
}

struct Circle { radius: f64 }
impl Shape for Circle {
    fn area(&self) -> f64 { std::f64::consts::PI * self.radius * self.radius }
}

// Unnecessary boxing when only one concrete type is used.
fn total_area(shapes: &[Box<dyn Shape>]) -> f64 {
    shapes.iter().map(|s| s.area()).sum()
}
```

## Good

```rust
trait Shape {
    fn area(&self) -> f64;
}

struct Circle { radius: f64 }
struct Rect { w: f64, h: f64 }
impl Shape for Circle {
    fn area(&self) -> f64 { std::f64::consts::PI * self.radius * self.radius }
}
impl Shape for Rect {
    fn area(&self) -> f64 { self.w * self.h }
}

// Static dispatch: monomorphized, inlinable, but one copy per type
fn total_area<S: Shape>(shapes: &[S]) -> f64 {
    shapes.iter().map(|s| s.area()).sum()
}
// impl Trait in argument position monomorphizes the same way
fn print_area(shape: &impl Shape) { println!("{:.2}", shape.area()); }

// Dynamic dispatch: one code path for heterogeneous values, via fat pointers
fn total_area_dyn(shapes: &[Box<dyn Shape>]) -> f64 {
    shapes.iter().map(|s| s.area()).sum()
}
```

## See Also

- [rust-anti-type-erasure](anti-type-erasure.md) - don't use `Box<dyn Trait>` when `impl Trait` works
- [rust-type-generic-bounds](type-generic-bounds.md) - Add trait bounds only where needed
- [rust-trait-object-safety](trait-object-safety.md) - keep traits dyn-compatible when you need `dyn Trait`
