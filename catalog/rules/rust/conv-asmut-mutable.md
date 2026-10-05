---
id: rust-conv-asmut-mutable
lang: rust
prefix: conv
title: "Accept `impl AsMut<T>` for flexible mutable borrowed inputs instead of concrete mutable references"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["asmut", "mutable", "accept", "impl", "flexible", "borrowed", "inputs", "concrete"]
  files: ["**/*.rs"]
related: ["rust-api-impl-asref", "rust-own-slice-over-vec"]
sources:
  - title: "rust-skills: conv-asmut-mutable"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/conv-asmut-mutable.md
---
> Accept `impl AsMut<T>` for flexible mutable borrowed inputs instead of concrete mutable references

## Why

`AsMut<T>` is the mutable mirror of `AsRef<T>`. Accepting `impl AsMut<[u8]>` instead of `&mut Vec<u8>` lets callers pass `&mut Vec<u8>`, `&mut [u8]`, or `&mut [u8; N]` arrays without any conversion overhead. This widens the function's usefulness without changing its implementation or runtime cost. Reserve it for genuinely generic write targets — not every `&mut T` parameter needs this treatment.

## Bad

```rust
// Only accepts &mut Vec<u8>; arrays and slices are excluded
fn fill_zeros(buf: &mut Vec<u8>) {
    for b in buf.iter_mut() {
        *b = 0;
    }
}

fn main() {
    let mut data = vec![1u8, 2, 3];
    fill_zeros(&mut data);

    // Compile error — cannot pass &mut [u8; 3] or &mut [u8]
    // let mut arr = [1u8, 2, 3];
    // fill_zeros(&mut arr);
}
```

## Good

```rust
// Accepts Vec<u8>, [u8; N], &mut [u8] — any type that lends &mut [u8]
fn fill_zeros(mut buf: impl AsMut<[u8]>) {
    for b in buf.as_mut().iter_mut() {
        *b = 0;
    }
}

fn verify(mut buf: impl AsMut<[u8]>) -> bool {
    buf.as_mut().iter().all(|&b| b == 0)
}

fn main() {
    let mut vec_buf = vec![1u8, 2, 3];
    fill_zeros(&mut vec_buf);
    assert!(verify(&mut vec_buf));

    let mut arr_buf = [1u8, 2, 3, 4];
    fill_zeros(&mut arr_buf);
    assert!(verify(&mut arr_buf));

    let mut slice_buf = [5u8, 6, 7];
    fill_zeros(slice_buf.as_mut());
    assert!(verify(slice_buf.as_mut()));
}
```

## See Also

- [rust-api-impl-asref](api-impl-asref.md) - The read-only counterpart for borrowed inputs
- [rust-own-slice-over-vec](own-slice-over-vec.md) - prefer `&[T]` over `&Vec<T>` for immutable slices
