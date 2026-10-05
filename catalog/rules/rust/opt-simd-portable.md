---
id: rust-opt-simd-portable
lang: rust
prefix: opt
title: "Prefer autovectorization on stable; portable SIMD remains nightly-only"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["simd", "portable", "vectorized", "operations", "across", "architectures"]
  files: ["**/*.rs"]
related: ["rust-opt-target-cpu", "rust-opt-bounds-check", "rust-perf-profile-first"]
sources:
  - title: "rust-skills: opt-simd-portable"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/opt-simd-portable.md
---
> Prefer autovectorization on stable; portable SIMD remains nightly-only

## Why

SIMD (Single Instruction, Multiple Data) processes multiple values per instruction—4x, 8x, or more speedup for suitable algorithms. Rust's portable SIMD (nightly) and crates like `wide` provide cross-platform vectorization without architecture-specific intrinsics. For stable Rust, let LLVM auto-vectorize or use platform-specific crates.

## Bad

```rust
#[cfg(target_arch = "x86_64")]
use std::arch::x86_64::*;

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2")]
unsafe fn sum_avx2(data: &[f32]) -> f32 {
    let mut acc = _mm256_setzero_ps();
    let mut chunks = data.chunks_exact(8);
    for chunk in &mut chunks {
        let v = _mm256_loadu_ps(chunk.as_ptr());
        acc = _mm256_add_ps(acc, v);
    }

    // store the 8 lanes, then finish the reduction (and the remainder) in scalar
    let mut lanes = [0.0f32; 8];
    _mm256_storeu_ps(lanes.as_mut_ptr(), acc);
    lanes.iter().sum::<f32>() + chunks.remainder().iter().sum::<f32>()
}
```

## Good

```rust
// LLVM often vectorizes simple patterns automatically
fn sum(data: &[f32]) -> f32 {
    data.iter().sum()  // May vectorize to SIMD
}

fn add_arrays(a: &[f32], b: &[f32], out: &mut [f32]) {
    for ((x, y), o) in a.iter().zip(b).zip(out.iter_mut()) {
        *o = x + y;  // Often vectorizes
    }
}

// Help autovectorization:
// 1. Use iterators over indexing
// 2. Avoid early exits in loops
// 3. Use chunks_exact for aligned access
```

## See Also

- [rust-opt-target-cpu](opt-target-cpu.md) - Enable SIMD features
- [rust-opt-bounds-check](opt-bounds-check.md) - Unchecked access for SIMD
- [rust-perf-profile-first](perf-profile-first.md) - Identify vectorization opportunities
