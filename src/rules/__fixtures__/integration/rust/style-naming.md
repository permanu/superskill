---
id: rust-style-naming
lang: rust
prefix: style
title: Name conversion methods after the owned and borrowed types
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, style]
  files: ["**/*.rs"]
sources:
  - title: Rust API Guidelines - Naming
    url: https://rust-lang.github.io/api-guidelines/naming.html
---
> Name conversions as, to_, and into_ by what the caller gives up.

## Why

The as_/to_/into_ prefixes encode cost and ownership, so readers know whether a call borrows, copies, or consumes without opening the signature.

## Bad

```rust
impl User {
    fn name(&self) -> &str {
        &self.name
    }
}
```

## Good

```rust
impl User {
    fn as_name(&self) -> &str {
        &self.name
    }
}
```
