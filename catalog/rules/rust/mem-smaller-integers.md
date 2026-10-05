---
id: rust-mem-smaller-integers
lang: rust
prefix: mem
title: "Use appropriately-sized integers to reduce memory footprint"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["smaller", "integers", "appropriately-sized", "reduce", "memory", "footprint"]
  files: ["**/*.rs"]
related: ["rust-mem-box-large-variant", "rust-mem-assert-type-size", "rust-type-newtype-ids", "rust-num-nonzero", "rust-num-cast-try-from"]
sources:
  - title: "rust-skills: mem-smaller-integers"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-smaller-integers.md
---
> Use appropriately-sized integers to reduce memory footprint

## Why

Using `i64` when `i16` suffices wastes 6 bytes per value. In arrays, vectors, and structs with millions of instances, this waste compounds dramatically. Choosing the smallest integer type that fits your domain reduces memory usage and improves cache utilization.

## Bad

```rust
struct Pixel {
    r: u64,  // Color channels 0-255 = 8 bits needed
    g: u64,  // Using 64 bits = 8x waste
    b: u64,
    a: u64,
}
// Size: 32 bytes per pixel

struct HttpStatus {
    code: i32,      // HTTP codes 100-599 = 10 bits needed
    version: i32,   // HTTP 1.0, 1.1, 2, 3 = 2 bits needed
}
// Size: 8 bytes per status

struct GeoPoint {
    lat: f64,   // -90 to 90
    lon: f64,   // -180 to 180
}
// Often f32 precision is sufficient for display
```

## Good

```rust
struct Pixel {
    r: u8,
    g: u8,
    b: u8,
    a: u8,
}
// Size: 4 bytes per pixel (8x smaller!)

struct HttpStatus {
    code: u16,      // 100-599 fits in u16
    version: u8,    // 1, 2, 3 fits in u8
}
// Size: 3 bytes (+ 1 padding = 4 bytes)

struct GeoPoint {
    lat: f32,   // ~7 decimal digits precision
    lon: f32,   // Sufficient for most geo applications
}
// Size: 8 bytes vs 16 bytes
```

## See Also

- [rust-mem-box-large-variant](mem-box-large-variant.md) - Optimizing enum sizes
- [rust-mem-assert-type-size](mem-assert-type-size.md) - Compile-time size checks
- [rust-type-newtype-ids](type-newtype-ids.md) - Type safety for integer IDs
- [rust-num-nonzero](num-nonzero.md) - NonZero* niche optimization
- [rust-num-cast-try-from](num-cast-try-from.md) - Avoid lossy `as` casts
