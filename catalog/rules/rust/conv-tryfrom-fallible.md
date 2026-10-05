---
id: rust-conv-tryfrom-fallible
lang: rust
prefix: conv
title: "Implement `TryFrom` for fallible conversions instead of ad-hoc conversion functions"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["tryfrom", "fallible", "implement", "conversions", "ad-hoc", "conversion", "functions"]
  files: ["**/*.rs"]
  symbols: ["TryFrom"]
related: ["rust-api-from-not-into", "rust-conv-fromstr-parsing", "rust-api-parse-dont-validate"]
sources:
  - title: "rust-skills: conv-tryfrom-fallible"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/conv-tryfrom-fallible.md
---
> Implement `TryFrom` for fallible conversions instead of ad-hoc conversion functions

## Why

`TryFrom`/`TryInto` is the standard trait pair for conversions that can fail. Implementing `TryFrom<T>` automatically provides `TryInto` for callers (API Guidelines C-CONV-TRAITS), enabling ergonomic `.try_into()?` at call sites. It integrates naturally with the `?` operator, ecosystem crates, and generic bounds that constrain `T: TryFrom<U>`. Ad-hoc conversion functions scatter the conversion surface and deprive callers of these benefits.

## Bad

```rust
use std::io;

struct Port(u16);

// Bespoke function — callers must know its name, can't use `.try_into()`
fn port_from_u32(n: u32) -> Result<Port, String> {
    if n > u16::MAX as u32 {
        return Err(format!("port {} out of range", n));
    }
    Ok(Port(n as u16))
}

fn main() {
    let p = port_from_u32(8080).unwrap();
}
```

## Good

```rust
#[derive(Debug)] struct Port(u16);
#[derive(Debug)] struct PortError(u32);

impl std::fmt::Display for PortError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "port {} is out of range", self.0)
    }
}

impl std::error::Error for PortError {}

impl TryFrom<u32> for Port {
    type Error = PortError;
    fn try_from(value: u32) -> Result<Self, Self::Error> {
        u16::try_from(value).map(Port).map_err(|_| PortError(value))
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let p: Port = 8080_u32.try_into()?;
    println!("port: {}", p.0);
    Ok(())
}
```

## See Also

- [rust-api-from-not-into](api-from-not-into.md) - implement `From`, not `Into`, for the same reason
- [rust-conv-fromstr-parsing](conv-fromstr-parsing.md) - Standard hook for string→type parsing
- [rust-api-parse-dont-validate](api-parse-dont-validate.md) - Parse into validated types at boundaries
