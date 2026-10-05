---
id: rust-trait-object-safety
lang: rust
prefix: trait
title: "Keep a trait dyn-compatible (object-safe) when you need `dyn Trait`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["object", "safety", "keep", "trait", "dyn-compatible", "object-safe", "dyn"]
  files: ["**/*.rs"]
related: ["rust-trait-dyn-vs-generic", "rust-anti-type-erasure", "rust-api-sealed-trait"]
sources:
  - title: "rust-skills: trait-object-safety"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/trait-object-safety.md
---
> Keep a trait dyn-compatible (object-safe) when you need `dyn Trait`

## Why

Only dyn-compatible traits can be used as `dyn Trait`. The Rust Reference defines dyn compatibility: every method must be dispatchable through a vtable, which means no generic type parameters on methods, no bare `Self` return or value position, and no associated constants. Violating these rules produces a hard compiler error at the `dyn` use site — at a use site far from the trait definition. If you need both generic methods and `dyn Trait`, you can gate the non-dispatchable methods with `where Self: Sized`, which excludes them from the vtable while keeping the rest of the trait object-safe.

## Bad

```rust
trait Transformer {
    // Generic method — not dispatchable, makes the whole trait non-object-safe.
    fn transform<T: std::fmt::Debug>(&self, value: T) -> String;

    fn name(&self) -> &str;
}

struct Shout;
impl Transformer for Shout {
    fn transform<T: std::fmt::Debug>(&self, value: T) -> String {
        format!("{value:?}").to_uppercase()
    }
    fn name(&self) -> &str { "shout" }
}

// This fails to compile:
// error[E0038]: the trait `Transformer` cannot be made into an object
// fn apply(t: &dyn Transformer, x: i32) {} // rejected at this call site
```

## Good

```rust
trait Transformer {
    fn transform_str(&self, value: &str) -> String;
    fn name(&self) -> &str;

    fn transform_debug<T: std::fmt::Debug>(&self, value: T) -> String where Self: Sized {
        self.transform_str(&format!("{value:?}"))
    }
}

struct Shout;
impl Transformer for Shout {
    fn transform_str(&self, value: &str) -> String { value.to_uppercase() }
    fn name(&self) -> &str { "shout" }
}

fn apply_all(transformers: &[Box<dyn Transformer>], input: &str) {
    for t in transformers {
        println!("[{}] {}", t.name(), t.transform_str(input));
    }
}

let ts: Vec<Box<dyn Transformer>> = vec![Box::new(Shout)];
apply_all(&ts, "Hello World");
let shout = Shout;
let _ = shout.transform_debug(42);
```

## See Also

- [rust-trait-dyn-vs-generic](trait-dyn-vs-generic.md) - Choose between static and dynamic dispatch deliberately
- [rust-anti-type-erasure](anti-type-erasure.md) - don't use `Box<dyn Trait>` when `impl Trait` works
- [rust-api-sealed-trait](api-sealed-trait.md) - Prevent external implementations of a trait
