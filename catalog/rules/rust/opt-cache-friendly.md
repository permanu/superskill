---
id: rust-opt-cache-friendly
lang: rust
prefix: opt
title: "Organize data for cache-efficient access patterns"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["cache", "friendly", "organize", "data", "cache-efficient", "access", "patterns"]
  files: ["**/*.rs"]
related: ["rust-mem-smaller-integers", "rust-mem-box-large-variant", "rust-opt-bounds-check"]
sources:
  - title: "rust-skills: opt-cache-friendly"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/opt-cache-friendly.md
---
> Organize data for cache-efficient access patterns

## Why

Cache misses are expensive—a L3 cache miss costs ~100+ cycles vs ~4 cycles for L1 hit. Data layout and access patterns determine cache efficiency. Arrays of structs (AoS) vs structs of arrays (SoA), memory locality, and access patterns can make order-of-magnitude performance differences.

## Bad

```rust
// Array of Structs (AoS) - poor cache use when accessing one field
struct Particle {
    position: [f32; 3],  // 12 bytes
    velocity: [f32; 3],  // 12 bytes
    mass: f32,           // 4 bytes
    id: u64,             // 8 bytes
    flags: u8,           // 1 byte + padding
    // Total: 40 bytes per particle
}

fn update_positions(particles: &mut [Particle], dt: f32) {
    for p in particles {
        // Access position and velocity - 24 bytes
        // But loads 40-byte struct per particle
        // 16 bytes wasted per cache line load
        p.position[0] += p.velocity[0] * dt;
        p.position[1] += p.velocity[1] * dt;
        p.position[2] += p.velocity[2] * dt;
    }
}
```

## Good

```rust
// Struct of Arrays (SoA) - cache-efficient for field access
struct Particles {
    positions_x: Vec<f32>,
    positions_y: Vec<f32>,
    positions_z: Vec<f32>,
    velocities_x: Vec<f32>,
    velocities_y: Vec<f32>,
    velocities_z: Vec<f32>,
    masses: Vec<f32>,
    ids: Vec<u64>,
    flags: Vec<u8>,
}

fn update_positions(p: &mut Particles, dt: f32) {
    // Access contiguous memory - perfect cache utilization
    for (px, vx) in p.positions_x.iter_mut().zip(&p.velocities_x) {
        *px += vx * dt;
    }
    for (py, vy) in p.positions_y.iter_mut().zip(&p.velocities_y) {
        *py += vy * dt;
    }
    for (pz, vz) in p.positions_z.iter_mut().zip(&p.velocities_z) {
        *pz += vz * dt;
    }
}
```

## See Also

- [rust-mem-smaller-integers](mem-smaller-integers.md) - Smaller data fits more in cache
- [rust-mem-box-large-variant](mem-box-large-variant.md) - Keep enum sizes small
- [rust-opt-bounds-check](opt-bounds-check.md) - Sequential access patterns
