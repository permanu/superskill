---
id: rust-anti-string-for-str
lang: rust
prefix: anti
title: "Don't accept &String when &str works"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["string", "str", "don", "accept", "works"]
  files: ["**/*.rs"]
related: ["rust-anti-vec-for-slice", "rust-own-slice-over-vec", "rust-api-impl-asref"]
sources:
  - title: "rust-skills: anti-string-for-str"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-string-for-str.md
---
> Don't accept &String when &str works

## Why

`&String` is strictly less flexible than `&str`. A `&str` can be created from `String`, `&str`, literals, and slices. A `&String` requires exactly a `String`. This forces callers to allocate even when they only need to read.

## Bad

```rust
// Forces callers to have a String
fn greet(name: &String) {
    println!("Hello, {}", name);
}

// In struct
struct Config {
    name: String,
}

impl Config {
    fn set_name(&mut self, name: &String) {  // Too restrictive
        self.name = name.clone();
    }
}

fn main() {
    // Caller must allocate
    greet(&"Alice".to_string());  // Unnecessary allocation
    let name = String::from("Bob");
    greet(&name);                 // Only works if name is String
}
```

## Good

```rust
struct Config {
    name: String,
}

// Accept &str - works with String, &str, literals
fn greet(name: &str) {
    println!("Hello, {}", name);
}

impl Config {
    fn set_name(&mut self, name: &str) {
        self.name = name.to_string();
    }

    // Or accept owned String if the caller usually has one
    fn set_name_owned(&mut self, name: String) {
        self.name = name;
    }
}

fn main() {
    greet("Alice");       // String literal
    let name = String::from("Bob");
    greet(&name);         // &String coerces to &str
}
```

## See Also

- [rust-anti-vec-for-slice](anti-vec-for-slice.md) - Similar pattern for Vec
- [rust-own-slice-over-vec](own-slice-over-vec.md) - Slice patterns
- [rust-api-impl-asref](api-impl-asref.md) - AsRef pattern
