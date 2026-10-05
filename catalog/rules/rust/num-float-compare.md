---
id: rust-num-float-compare
lang: rust
prefix: num
title: "Don't compare floats with `==`; use a tolerance, and `total_cmp` for ordering"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["float", "compare", "don", "floats", "tolerance", "total_cmp", "ordering"]
  files: ["**/*.rs"]
  symbols: ["total_cmp"]
related: ["rust-num-overflow-explicit"]
sources:
  - title: "rust-skills: num-float-compare"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/num-float-compare.md
---
> Don't compare floats with `==`; use a tolerance, and `total_cmp` for ordering

## Why

Floating-point arithmetic is not exact: `0.1 + 0.2 == 0.3` evaluates to `false` in Rust (and every IEEE 754 language) because neither value is representable exactly in binary. Additionally, `NaN != NaN` by the IEEE 754 standard, so equality comparisons involving `NaN` always return `false`. For sorting, `f64::partial_cmp` returns `None` on `NaN`, which makes `sort_by` panic with an inconsistent-order error. Use an epsilon tolerance for approximate equality and `f64::total_cmp` for total ordering.

## Bad

```rust
fn is_unit_length(x: f64, y: f64) -> bool {
    (x * x + y * y).sqrt() == 1.0  // almost always false due to rounding
}

fn sort_scores(scores: &mut Vec<f64>) {
    scores.sort_by(|a, b| a.partial_cmp(b).unwrap());
    // panics (unwrap on None) if any score is NaN
}
```

## Good

```rust
// Approximate equality for floats: use an absolute epsilon
fn approx_eq(a: f64, b: f64, epsilon: f64) -> bool {
    (a - b).abs() < epsilon
}

fn is_unit_length(x: f64, y: f64) -> bool {
    approx_eq((x * x + y * y).sqrt(), 1.0, 1e-9)
}

// Total ordering: NaN sorts after everything else, never panics
fn sort_scores(scores: &mut [f64]) {
    scores.sort_by(|a, b| a.total_cmp(b));
}

fn main() {
    assert_ne!(0.1_f64 + 0.2, 0.3); // IEEE 754 rounding
    assert!(approx_eq(0.1 + 0.2, 0.3, 1e-10));
    let mut v = vec![3.0_f64, 1.0, f64::NAN];
    sort_scores(&mut v);
    assert_eq!(&v[..2], &[1.0, 3.0]);
    assert!(v[2].is_nan());
}
```

## See Also

- [rust-num-overflow-explicit](num-overflow-explicit.md) - Handle integer overflow explicitly
