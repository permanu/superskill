---
id: rust-api-from-not-into
lang: rust
prefix: api
title: "Implement `From<T>`, not `Into<U>` - From gives you Into for free"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["implement", "gives", "free"]
  files: ["**/*.rs"]
  symbols: ["From", "Into"]
related: ["rust-api-impl-into", "rust-err-from-impl", "rust-api-newtype-safety", "rust-conv-tryfrom-fallible", "rust-conv-fromstr-parsing"]
sources:
  - title: "rust-skills: api-from-not-into"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-from-not-into.md
---
> Implement `From<T>`, not `Into<U>` - From gives you Into for free

## Why

The standard library has a blanket implementation: `impl<T, U> Into<U> for T where U: From<T>`. This means implementing `From<T> for U` automatically gives you `Into<U> for T`. Implementing `Into` directly bypasses this and is considered non-idiomatic. Always implement `From`.

## Bad

```rust
struct UserId(u64);

// Non-idiomatic: implementing Into directly
impl Into<UserId> for u64 {
    fn into(self) -> UserId {
        UserId(self)
    }
}

fn main() {
    // Works, but now you can't use From syntax
    // let id = UserId::from(42);  // Error: From not implemented
    let id: UserId = 42.into(); // Works, but limited
    let _ = id;
}
```

## Good

```rust
struct UserId(u64);

// Idiomatic: implement From
impl From<u64> for UserId {
    fn from(id: u64) -> Self {
        UserId(id)
    }
}

// And Into bound works in generics
fn process(id: impl Into<UserId>) {
    let id: UserId = id.into();
    let _ = id;
}

fn main() {
    // Now both work automatically
    let id = UserId::from(42);   // From syntax
    let id: UserId = 42.into();  // Into syntax (via blanket impl)
    let _ = id;

    process(42u64);  // Works!
}
```

## See Also

- [rust-api-impl-into](api-impl-into.md) - Using Into in function parameters
- [rust-err-from-impl](err-from-impl.md) - From for error types
- [rust-api-newtype-safety](api-newtype-safety.md) - Newtype conversions
- [rust-conv-tryfrom-fallible](conv-tryfrom-fallible.md) - TryFrom for fallible conversions
- [rust-conv-fromstr-parsing](conv-fromstr-parsing.md) - FromStr for string parsing
