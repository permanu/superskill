---
id: rust-num-saturating-clamp
lang: rust
prefix: num
title: "Bound values with `clamp` and saturating arithmetic"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["saturating", "clamp", "bound", "values", "arithmetic"]
  files: ["**/*.rs"]
  symbols: ["clamp"]
related: ["rust-num-overflow-explicit", "rust-num-cast-try-from"]
sources:
  - title: "rust-skills: num-saturating-clamp"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/num-saturating-clamp.md
---
> Bound values with `clamp` and saturating arithmetic

## Why

Constraining a numeric value to a range is a common operation, but hand-rolled `if`/`min`/`max` chains are verbose and easy to get wrong (especially when combining signed and unsigned types). `Ord::clamp(min, max)` expresses the intent in a single call and is available on all types that implement `Ord` (all integer primitives, and `f32`/`f64` via their own `clamp`). When you additionally want arithmetic that stops at the type's limits rather than panicking or wrapping, combine `clamp` with `saturating_*` methods.

## Bad

```rust
fn apply_damage(health: i32, damage: i32) -> i32 {
    let result = health - damage;
    if result < 0 { 0 } else { result }  // verbose, easy to mis-order
}

fn clamp_volume(vol: u8, min: u8, max: u8) -> u8 {
    if vol < min {
        min
    } else if vol > max {
        max
    } else {
        vol
    }
}
```

## Good

```rust
// saturating_sub stops at i32::MIN — then clamp ensures non-negative
fn apply_damage(health: i32, damage: i32) -> i32 {
    health.saturating_sub(damage).clamp(0, i32::MAX)
}

// integer clamp: any Ord type
fn clamp_volume(vol: u8, min: u8, max: u8) -> u8 {
    vol.clamp(min, max)
}

fn clamp_score(score: i64) -> i64 {
    score.clamp(0, 100)
}

// float clamp: available on f32/f64
fn normalize_alpha(a: f32) -> f32 {
    a.clamp(0.0, 1.0)  // NaN propagates: NaN.clamp(0.0, 1.0) == NaN
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn volume_is_bounded() { assert_eq!(clamp_volume(5, 10, 90), 10); }
}
```

## See Also

- [rust-num-overflow-explicit](num-overflow-explicit.md) - Handle overflow with `checked_`/`saturating_`/`wrapping_`/`overflowing_`
- [rust-num-cast-try-from](num-cast-try-from.md) - avoid `as` for narrowing casts; prefer `TryFrom`
