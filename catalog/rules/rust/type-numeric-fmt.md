---
id: rust-type-numeric-fmt
lang: rust
prefix: type
title: "Implement `LowerHex`, `UpperHex`, `Octal`, and `Binary` for numeric newtypes"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["numeric", "fmt", "implement", "lowerhex", "upperhex", "octal", "binary", "newtypes"]
  files: ["**/*.rs"]
  symbols: ["LowerHex", "UpperHex", "Octal", "Binary"]
related: ["rust-type-newtype-ids", "rust-type-display-vs-debug"]
sources:
  - title: "rust-skills: type-numeric-fmt"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/type-numeric-fmt.md
---
> Implement `LowerHex`, `UpperHex`, `Octal`, and `Binary` for numeric newtypes

## Why

Rust's API Guidelines (C-NUM-FMT) state that numeric types should support `{:x}`, `{:X}`, `{:o}`, and `{:b}` wherever the underlying integer type does. A numeric newtype that silently drops these format specifiers is an ergonomic regression — callers who reach for `{:x}` to debug a bitmask or address will hit a compile error instead. The fix is a one-liner per trait that forwards to the inner value's formatter.

## Bad

```rust
use std::fmt;

struct Mask(u32);

impl fmt::Display for Mask {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

fn main() {
    let m = Mask(0xDEAD_BEEF);
    println!("{}", m);   // ok
    // println!("{:x}", m); // compile error: Mask doesn't implement LowerHex
}
```

## Good

```rust
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Mask(u32);

impl fmt::Display for Mask {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result { fmt::Display::fmt(&self.0, f) }
}
impl fmt::LowerHex for Mask {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result { fmt::LowerHex::fmt(&self.0, f) }
}
impl fmt::UpperHex for Mask {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result { fmt::UpperHex::fmt(&self.0, f) }
}
impl fmt::Octal for Mask {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result { fmt::Octal::fmt(&self.0, f) }
}
impl fmt::Binary for Mask {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result { fmt::Binary::fmt(&self.0, f) }
}

fn main() {
    let m = Mask(0xDEAD_BEEF);
    println!("{m} {m:x} {m:X} {m:o} {m:b} {m:#010x}");  // every specifier works
}
```

## See Also

- [rust-type-newtype-ids](type-newtype-ids.md) - wrapping IDs and numeric values in newtypes
- [rust-type-display-vs-debug](type-display-vs-debug.md) - choosing between `Display` and `Debug`
