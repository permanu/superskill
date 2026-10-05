---
id: rust-num-cast-try-from
lang: rust
prefix: num
title: "Avoid `as` for narrowing casts; use `From` for widening and `TryFrom` for narrowing"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["cast", "try", "narrowing", "casts", "widening", "tryfrom"]
  files: ["**/*.rs"]
  symbols: ["as", "From", "TryFrom"]
related: ["rust-conv-tryfrom-fallible", "rust-num-overflow-explicit"]
sources:
  - title: "rust-skills: num-cast-try-from"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/num-cast-try-from.md
---
> Avoid `as` for narrowing casts; use `From` for widening and `TryFrom` for narrowing

## Why

The `as` cast silently truncates or wraps on narrowing (`300u32 as u8 == 44`) and produces surprising results on float-to-integer conversion (values outside range saturate to the type's min/max, but `NaN` becomes `0`). These behaviors are easy to miss during code review and impossible to catch at runtime without tests. `From`/`Into` are lossless by design and will not compile for lossy conversions; `TryFrom`/`TryInto` return `Result` and make the fallibility explicit.

## Bad

```rust
fn narrow(x: u32) -> u8 {
    x as u8  // silently truncates: 300 becomes 44
}

fn to_index(f: f64) -> usize {
    f as usize  // NaN becomes 0, negatives become 0, may truncate
}

fn widen(x: u8) -> u32 {
    x as u32  // works, but hides that this is always safe
}
```

## Good

```rust
// widening: From<u8> for u32 is always lossless — won't compile if lossy
fn widen(x: u8) -> u32 { u32::from(x) }

// narrowing: TryFrom makes the failure case explicit
fn narrow(x: u32) -> Result<u8, <u8 as TryFrom<u32>>::Error> {
    u8::try_from(x)
}

// float -> integer: validate the range manually before casting
fn float_to_index(f: f64, len: usize) -> Option<usize> {
    if f.is_nan() || f < 0.0 || f >= len as f64 {
        return None;
    }
    Some(f as usize)  // `as` is acceptable here: range is verified above
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn narrow_errors_on_overflow() {
        assert!(narrow(300).is_err());
        assert_eq!(narrow(200), Ok(200u8));
    }
}
```

## See Also

- [rust-conv-tryfrom-fallible](conv-tryfrom-fallible.md) - implement `TryFrom` for your own fallible conversions
- [rust-num-overflow-explicit](num-overflow-explicit.md) - Handle integer overflow explicitly with `checked_`/`saturating_`/`wrapping_`
