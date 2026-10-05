---
id: rust-closure-fn-trait-bounds
lang: rust
prefix: closure
title: "Require the least restrictive `Fn` trait a callback needs (`FnOnce` ⊇ `FnMut` ⊇ `Fn`)"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["trait", "bounds", "require", "restrictive", "callback", "fnonce", "fnmut"]
  files: ["**/*.rs"]
  symbols: ["Fn", "FnOnce", "FnMut"]
related: ["rust-closure-static-vs-dyn", "rust-closure-move-capture"]
sources:
  - title: "rust-skills: closure-fn-trait-bounds"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/closure-fn-trait-bounds.md
---
> Require the least restrictive `Fn` trait a callback needs (`FnOnce` ⊇ `FnMut` ⊇ `Fn`)

## Why

`FnOnce` is implemented by every closure — it may consume its captures and can only be called once. `FnMut` is implemented by closures that mutate captures, and implies `FnOnce`. `Fn` is the strictest: it only reads captures and can be called any number of times concurrently. Bounding a parameter with the weakest trait the body actually requires accepts the widest set of callers. Requiring `Fn` when you only call the closure once needlessly rejects move-consuming closures.

## Bad

```rust
// F: Fn is too strict — the closure is only called once,
// so move-consuming closures are unnecessarily rejected.
fn run_once_bad<F: Fn() -> String>(f: F) -> String {
    f()
}

fn demo_bad() {
    let s = String::from("hello");
    // This closure consumes `s`, so it only implements FnOnce, not Fn.
    // run_once_bad(move || s) // compile error: `s` moved in closure
    let _ = run_once_bad(|| String::from("ok")); // forced to use non-consuming closure
}
```

## Good

```rust
fn run_once<F: FnOnce() -> String>(f: F) -> String {
    f()
}

fn retry<F: FnMut() -> bool>(mut f: F, attempts: usize) -> bool {
    (0..attempts).any(|_| f())
}

fn for_each<T, F: Fn(&T)>(items: &[T], f: F) {
    for item in items {
        f(item);
    }
}

fn demo() {
    // FnOnce: move-consuming closure is accepted
    let s = String::from("hello");
    assert_eq!(run_once(move || s.to_uppercase()), "HELLO");
    // FnMut: closure mutates a counter
    let mut count = 0usize;
    assert!(retry(|| { count += 1; count == 3 }, 5));
    // Fn: read-only closure
    for_each(&[1, 2, 3], |n| println!("{n}"));
}
```

## See Also

- [rust-closure-static-vs-dyn](closure-static-vs-dyn.md) - Generic vs dynamic dispatch for callbacks
- [rust-closure-move-capture](closure-move-capture.md) - When and how to use `move` closures
