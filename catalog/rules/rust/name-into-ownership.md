---
id: rust-name-into-ownership
lang: rust
prefix: name
title: "Use `into_` prefix for ownership-consuming conversions"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["ownership", "into_", "prefix", "ownership-consuming", "conversions"]
  files: ["**/*.rs"]
  symbols: ["into_"]
related: ["rust-name-as-free", "rust-name-to-expensive", "rust-api-from-not-into"]
sources:
  - title: "rust-skills: name-into-ownership"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-into-ownership.md
---
> Use `into_` prefix for ownership-consuming conversions

## Why

The `into_` prefix signals "this method consumes self and returns something else." The original value is moved and no longer usable. This ownership transfer is usually cheap (no allocation), but the caller loses access to the original. Clear naming prevents "use after move" confusion.

## Bad

```rust
struct Inner;

struct Wrapper {
    inner: Inner,
}

impl Wrapper {
    // Misleading: doesn't indicate ownership transfer
    fn get_inner(self) -> Inner {  
        self.inner
    }
    
    // Misleading: suggests borrowing
    fn as_inner(self) -> Inner {  // Takes self by value!
        self.inner
    }
}
```

## Good

```rust
struct Inner;

struct Wrapper {
    inner: Inner,
}

impl Wrapper {
    fn new(inner: Inner) -> Self {
        Self { inner }
    }

    // into_ clearly shows ownership transfer
    fn into_inner(self) -> Inner {
        self.inner
    }
}

fn main() {
    // Usage is clear
    let inner = Inner;
    let wrapper = Wrapper::new(inner);
    let _inner = wrapper.into_inner();  // wrapper is consumed
    // wrapper.foo();  // Error: use of moved value
}
```

## See Also

- [rust-name-as-free](name-as-free.md) - Borrowing conversions
- [rust-name-to-expensive](name-to-expensive.md) - Allocating conversions
- [rust-api-from-not-into](api-from-not-into.md) - From trait implementation
