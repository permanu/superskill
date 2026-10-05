---
id: rust-own-slice-over-vec
lang: rust
prefix: own
title: "Accept `&[T]` not `&Vec<T>`, `&str` not `&String`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["slice", "vec", "accept", "str", "string"]
  files: ["**/*.rs"]
  symbols: ["Vec", "str", "String"]
related: ["rust-api-impl-asref", "rust-own-borrow-over-clone"]
sources:
  - title: "rust-skills: own-slice-over-vec"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/own-slice-over-vec.md
---
> Accept `&[T]` not `&Vec<T>`, `&str` not `&String`

## Why

Accepting `&[T]` instead of `&Vec<T>` makes your function more flexible - it can accept slices from arrays, vectors, or other sources. Similarly, `&str` accepts string slices from `String`, `&'static str`, or substrings.

## Bad

```rust
// Overly restrictive - only accepts &Vec
fn sum(numbers: &Vec<i32>) -> i32 {
    numbers.iter().sum()
}

// Overly restrictive - only accepts &String
fn greet(name: &String) {
    println!("Hello, {}", name);
}

// Can't call with arrays or slices
fn main() {
    let arr = [1, 2, 3];
    // sum(&arr);  // ERROR: expected &Vec<i32>

    let literal = "world";
    // greet(&literal);  // ERROR: expected &String
}
```

## Good

```rust
// Flexible - accepts any slice-like thing
fn sum(numbers: &[i32]) -> i32 {
    numbers.iter().sum()
}

// Flexible - accepts any string-like thing
fn greet(name: &str) {
    println!("Hello, {}", name);
}

// Now all of these work:
fn main() {
    let vec = vec![1, 2, 3];
    let arr = [4, 5, 6];
    let slice = &vec[0..2];

    sum(&vec);    // Vec coerces to slice
    sum(&arr);    // Array coerces to slice
    sum(slice);   // Slice works directly

    let string = String::from("Alice");
    let literal = "Bob";
    greet(&string);  // String coerces to &str
    greet(literal);  // &str works directly
}
```

## See Also

- [rust-api-impl-asref](api-impl-asref.md) - Accept `impl AsRef<T>` for maximum flexibility
- [rust-own-borrow-over-clone](own-borrow-over-clone.md) - Prefer borrowing over cloning
