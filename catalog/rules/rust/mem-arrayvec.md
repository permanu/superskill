---
id: rust-mem-arrayvec
lang: rust
prefix: mem
title: "Use `ArrayVec<T, N>` for fixed-capacity collections that never heap-allocate"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["arrayvec", "fixed-capacity", "collections", "heap-allocate"]
  files: ["**/*.rs"]
  symbols: ["ArrayVec"]
related: ["rust-mem-smallvec", "rust-mem-with-capacity", "rust-own-move-large"]
sources:
  - title: "rust-skills: mem-arrayvec"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-arrayvec.md
---
> Use `ArrayVec<T, N>` for fixed-capacity collections that never heap-allocate

## Why

`ArrayVec` from the `arrayvec` crate provides Vec-like API with a compile-time maximum capacity, storing all elements inline on the stack. Unlike `SmallVec` which can spill to heap, `ArrayVec` guarantees no heap allocation—if you exceed capacity, it returns an error or panics. This is ideal for embedded systems, real-time code, or when you have a hard upper bound.

## Bad

```rust
// Vec always heap-allocates, even for small collections
fn parse_options(input: &str) -> Vec<Option<u32>> {
    let mut options = Vec::new();  // Heap allocation
    for part in input.split(',').take(8) {  // Know we never exceed 8
        options.push(parse_option(part));
    }
    options
}

fn parse_option(part: &str) -> Option<u32> {
    part.parse().ok()
}

// Or SmallVec when you truly can't exceed capacity
use smallvec::SmallVec;
fn get_flags() -> SmallVec<[Flag; 4]> {
    // SmallVec CAN heap-allocate if pushed beyond 4
    // That might be unexpected in no-alloc contexts
    SmallVec::new()
}

#[derive(Clone, Copy)]
struct Flag;
```

## Good

```rust
use arrayvec::ArrayVec;

// Guaranteed no heap allocation
fn parse_options(input: &str) -> ArrayVec<Option<u32>, 8> {
    let mut options = ArrayVec::new();
    for part in input.split(',') {
        if options.try_push(part.parse().ok()).is_err() {
            break;  // Capacity reached, stop
        }
    }
    options
}

// Panic-on-overflow push with a hard bound
fn collect_readings() -> ArrayVec<u32, 16> {
    let mut readings = ArrayVec::new();
    for sensor in SENSORS {
        readings.push(sensor);  // Panics if more than 16
    }
    readings
}

static SENSORS: [u32; 3] = [1, 2, 3];
```

## See Also

- [rust-mem-smallvec](mem-smallvec.md) - When heap fallback is acceptable
- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocating Vec capacity
- [rust-own-move-large](own-move-large.md) - Large stack types considerations
