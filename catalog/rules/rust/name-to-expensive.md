---
id: rust-name-to-expensive
lang: rust
prefix: name
title: "Use `to_` prefix for expensive conversions that allocate or compute"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["expensive", "to_", "prefix", "conversions", "allocate", "compute"]
  files: ["**/*.rs"]
  symbols: ["to_"]
related: ["rust-name-as-free", "rust-name-into-ownership", "rust-own-cow-conditional"]
sources:
  - title: "rust-skills: name-to-expensive"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-to-expensive.md
---
> Use `to_` prefix for expensive conversions that allocate or compute

## Why

The `to_` prefix signals "this conversion has a cost"—typically allocation, cloning, or computation. Callers know the call is costly, so they can cache the result or avoid repeated calls. This contrasts with `as_` (free reference conversion) and `into_` (ownership transfer).

## Bad

```rust
struct Name(String);

impl Name {
    // Misleading: suggests expensive operation
    fn as_uppercase(&self) -> String {
        self.0.to_uppercase()  // Allocates!
    }
    
    // Misleading: suggests cheap reference
    fn get_string(&self) -> String {
        self.0.clone()  // Allocates!
    }
}
```

## Good

```rust
struct Name(String);

impl Name {
    // to_ = allocates/computes
    fn to_uppercase(&self) -> String {
        self.0.to_uppercase()
    }
    
    // to_ = creates new value
    fn to_string(&self) -> String {
        self.0.clone()
    }
    
    // as_ = free reference (cheap)
    fn as_str(&self) -> &str {
        &self.0
    }
}
```

## See Also

- [rust-name-as-free](name-as-free.md) - Free reference conversions
- [rust-name-into-ownership](name-into-ownership.md) - Ownership transfer
- [rust-own-cow-conditional](own-cow-conditional.md) - Avoiding unnecessary allocations
