---
id: rust-trait-associated-type-vs-generic
lang: rust
prefix: trait
title: "Use an associated type when each impl has exactly one output type; use a generic parameter when a type can implement the trait for many input types"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["associated", "type", "generic", "impl", "exactly", "output", "parameter", "implement"]
  files: ["**/*.rs"]
related: ["rust-type-generic-bounds", "rust-trait-default-methods", "rust-api-impl-fromiterator"]
sources:
  - title: "rust-skills: trait-associated-type-vs-generic"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/trait-associated-type-vs-generic.md
---
> Use an associated type when each impl has exactly one output type; use a generic parameter when a type can implement the trait for many input types

## Why

The choice between `type Output;` and `<Rhs>` has two concrete consequences. First, an associated type is **part of the implementing type's identity**: callers never name it with turbofish because there is only one valid binding per impl. Second, a generic parameter allows **multiple simultaneous impls** on the same type — `impl Add<f64> for Vec2` and `impl Add<Vec2> for Vec2` can coexist, while `impl Iterator` can only define one `Item`. Using an associated type when multiple impls are needed makes those impls impossible; using a generic parameter when there is only one output forces every call site to write noisy turbofish or type annotations.

Rule of thumb: use an associated type when each implementor has a single natural output, and a generic parameter when a type needs to implement the trait for several input types.

## Bad

```rust
// Using a generic parameter for a trait that has exactly one output per type.
// Callers must now write Parser<String, Output = Ast> or face ambiguity.
trait Parser<Output> {
    fn parse(&self, input: &str) -> Option<Output>;
}

struct JsonParser;

// Only one sensible Output ever exists for JsonParser, but the signature
// forces a type parameter that adds noise everywhere.
impl Parser<String> for JsonParser {
    fn parse(&self, input: &str) -> Option<String> {
        Some(input.to_owned())
    }
}

fn run<P: Parser<String>>(p: &P, s: &str) -> Option<String> {
    p.parse(s)
}
```

## Good

```rust
// Associated type: one output per implementor, no turbofish needed
trait Parser {
    type Output;
    fn parse(&self, input: &str) -> Option<Self::Output>;
}
struct NumberParser;
impl Parser for NumberParser {
    type Output = f64;
    fn parse(&self, input: &str) -> Option<f64> { input.trim().parse().ok() }
}
fn run<P: Parser>(p: &P, s: &str) -> Option<P::Output> { p.parse(s) }

// Generic parameter: the same type implements the trait for many inputs
#[derive(Debug, Clone, Copy)]
struct Vec2 { x: f64, y: f64 }
impl std::ops::Add<Vec2> for Vec2 {
    type Output = Vec2;
    fn add(self, rhs: Vec2) -> Vec2 { Vec2 { x: self.x + rhs.x, y: self.y + rhs.y } }
}
impl std::ops::Add<f64> for Vec2 {
    type Output = Vec2;
    fn add(self, rhs: f64) -> Vec2 { Vec2 { x: self.x + rhs, y: self.y + rhs } }
}
```

## See Also

- [rust-type-generic-bounds](type-generic-bounds.md) - Add trait bounds only where needed
- [rust-trait-default-methods](trait-default-methods.md) - Define traits with required + defaulted methods
- [rust-api-impl-fromiterator](api-impl-fromiterator.md) - implementing `FromIterator` (associated-type pattern)
