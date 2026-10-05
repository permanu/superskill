---
id: rust-anti-vec-for-slice
lang: rust
prefix: anti
title: "Don't accept &Vec<T> when &[T] works"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["vec", "slice", "don", "accept", "works"]
  files: ["**/*.rs"]
related: ["rust-anti-string-for-str", "rust-own-slice-over-vec", "rust-api-impl-asref"]
sources:
  - title: "rust-skills: anti-vec-for-slice"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-vec-for-slice.md
---
> Don't accept &Vec<T> when &[T] works

## Why

`&Vec<T>` is strictly less flexible than `&[T]`. A slice can be created from `Vec`, arrays, and other slice-like types. Accepting `&Vec<T>` forces callers to have exactly a `Vec`, preventing them from using arrays, slices, or other collections.

## Bad

```rust
// Forces callers to have a Vec
fn sum(numbers: &Vec<i32>) -> i32 {
    numbers.iter().sum()
}

fn main() {
    // Caller must allocate
    let arr = [1, 2, 3, 4, 5];
    sum(&arr.to_vec());  // Unnecessary allocation

    // Slice won't work
    let slice: &[i32] = &[1, 2, 3];
    // sum(slice);  // Error: expected &Vec<i32>
}
```

## Good

```rust
// Accept slice - works with Vec, arrays, slices
fn sum(numbers: &[i32]) -> i32 {
    numbers.iter().sum()
}

fn main() {
    let numbers = vec![1, 2, 3, 4];

    // All these work
    sum(&[1, 2, 3, 4, 5]);        // Array
    sum(&vec![1, 2, 3]);          // Vec
    sum(&numbers[1..3]);          // Slice of slice
    sum(numbers.as_slice());      // Explicit slice
}
```

## See Also

- [rust-anti-string-for-str](anti-string-for-str.md) - Similar for String
- [rust-own-slice-over-vec](own-slice-over-vec.md) - Slice patterns
- [rust-api-impl-asref](api-impl-asref.md) - AsRef pattern
