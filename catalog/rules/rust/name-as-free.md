---
id: rust-name-as-free
lang: rust
prefix: name
title: "`as_` prefix: free reference conversion"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["free", "as_", "prefix", "reference", "conversion"]
  files: ["**/*.rs"]
  symbols: ["as_"]
related: ["rust-name-to-expensive", "rust-name-into-ownership"]
sources:
  - title: "rust-skills: name-as-free"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-as-free.md
---
> `as_` prefix: free reference conversion

## Why

Consistent naming helps users understand API cost. `as_` prefix signals a free (O(1), no allocation) conversion that returns a reference. This convention is used throughout the standard library.

## Bad

```rust
struct MyType {
    value: String,
    processed: ProcessedData,
}

struct ProcessedData;

impl MyType {
    // BAD: as_ but allocates
    pub fn as_string(&self) -> String {
        format!("{}", self.value)  // Allocates! Should be to_string()
    }
    
    // BAD: as_ but expensive
    pub fn as_processed(&self) -> &ProcessedData {
        // Actually does expensive computation
        let _ = expensive_computation(&self.value);
        &self.processed
    }
}

fn expensive_computation(input: &str) -> ProcessedData {
    let _ = input;
    ProcessedData
}
```

## Good

```rust
struct MyType {
    value: String,
    inner: Inner,
}

struct Inner;

impl MyType {
    // GOOD: Free reference
    pub fn as_str(&self) -> &str {
        &self.value
    }
    
    // GOOD: to_ signals allocation
    pub fn to_string(&self) -> String {
        format!("{}", self.value)
    }
    
    // GOOD: into_ signals ownership transfer
    pub fn into_inner(self) -> Inner {
        self.inner
    }
}
```

## See Also

- [rust-name-to-expensive](name-to-expensive.md) - `to_` prefix for expensive conversions
- [rust-name-into-ownership](name-into-ownership.md) - `into_` prefix for ownership transfer
