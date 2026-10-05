---
id: rust-closure-disjoint-capture
lang: rust
prefix: closure
title: "Capture only what you use; lean on edition-2021 disjoint closure captures"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["disjoint", "capture", "lean", "edition-2021", "closure", "captures"]
  files: ["**/*.rs"]
related: ["rust-own-borrow-over-clone", "rust-closure-move-capture"]
sources:
  - title: "rust-skills: closure-disjoint-capture"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/closure-disjoint-capture.md
---
> Capture only what you use; lean on edition-2021 disjoint closure captures

## Why

Before the 2021 edition, a closure captured entire variables — using `config.threshold` pulled in the whole `config` struct, preventing other code from using any other field of `config` concurrently. Since Rust 2021, closures capture individual fields (`config.threshold` only), so sibling fields remain independently accessible. Take advantage of this: write closures that reference only the specific fields or values they need, and add `move` only when ownership is genuinely required. When you do need to `move` a single field, bind it to a local first so the rest of the struct stays usable.

## Bad

```rust
struct Config {
    threshold: i32,
    label: String,
}

fn demo_bad() {
    let config = Config { threshold: 10, label: String::from("demo") };

    // In pre-2021 editions the whole `config` is captured, blocking access
    // to `config.label` below. In 2021 this compiles, but the pattern of
    // capturing the whole struct via `move` is the real footgun:
    let threshold = config.threshold; // copy out the field first
    let check = move || threshold > 0; // now `config` is NOT fully moved

    // If instead you wrote: let check = move || config.threshold > 0;
    // `config` would be moved in, making `config.label` inaccessible afterwards.
    // Demonstrate the problematic pattern (commented out to allow compilation):
    // let check2 = move || config.threshold > 0;
    // println!("{}", config.label); // error: use of moved value

    println!("label still accessible: {}", config.label);
    assert!(check());
}
```

## Good

```rust
struct Config {
    threshold: i32,
    label: String,
}

fn main() {
    let config = Config { threshold: 10, label: String::from("active") };
    // Edition 2021: captures only `config.threshold`; label stays accessible.
    let check = || config.threshold > 0;
    println!("label: {}", config.label);
    assert!(check());
}

// Need to move one field? Bind it to a local first.
fn make_checker(config: Config) -> (impl Fn() -> bool, String) {
    let threshold = config.threshold; // i32 is Copy
    let checker = move || threshold > 0; // moves the local, not `config`
    (checker, config.label) // still usable
}
```

## See Also

- [rust-own-borrow-over-clone](own-borrow-over-clone.md) - Prefer borrowing over cloning
- [rust-closure-move-capture](closure-move-capture.md) - When to use `move` and how to clone selectively
