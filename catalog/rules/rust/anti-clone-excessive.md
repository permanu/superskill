---
id: rust-anti-clone-excessive
lang: rust
prefix: anti
title: "Don't clone when borrowing works"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["clone", "excessive", "don", "borrowing", "works"]
  files: ["**/*.rs"]
related: ["rust-own-borrow-over-clone", "rust-own-cow-conditional", "rust-own-arc-shared"]
sources:
  - title: "rust-skills: anti-clone-excessive"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-clone-excessive.md
---
> Don't clone when borrowing works

## Why

`.clone()` allocates memory and copies data. When you only need to read data, borrowing (`&T`) is free. Excessive cloning wastes memory and CPU cycles, and it signals a misunderstanding of ownership.

## Bad

```rust
struct User {
    name: String,
}

// Takes ownership even though it only reads
fn print_name(name: String) {
    println!("{}", name);
}

fn main() {
    let name = "Alice".to_string();
    print_name(name.clone()); // Unnecessary clone
    print_name(name);

    let items = vec![1, 2, 3];
    for item in items.clone() { // Clones the entire Vec
        println!("{item}");
    }
}

impl User {
    fn get_name(&self) -> String {
        self.name.clone() // Caller gains nothing from ownership
    }
}
```

## Good

```rust
struct User {
    name: String,
}

// Accept a reference when only reading
fn print_name(name: &str) {
    println!("{}", name);
}

fn main() {
    let name = "Alice".to_string();
    print_name(&name); // Borrow, no clone

    let items = vec![1, 2, 3];
    for item in &items {
        println!("{item}");
    }
}

// Return a reference when possible
impl User {
    fn get_name(&self) -> &str {
        &self.name
    }
}
```

## See Also

- [rust-own-borrow-over-clone](own-borrow-over-clone.md) - Borrowing patterns
- [rust-own-cow-conditional](own-cow-conditional.md) - Clone on write
- [rust-own-arc-shared](own-arc-shared.md) - Shared ownership
