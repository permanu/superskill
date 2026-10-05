---
id: rust-closure-move-capture
lang: rust
prefix: closure
title: "Use `move` for closures that outlive the current scope; clone before `move` to keep the original"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["move", "capture", "closures", "outlive", "current", "scope", "clone", "keep"]
  files: ["**/*.rs"]
related: ["rust-async-clone-before-await", "rust-own-move-large", "rust-closure-disjoint-capture"]
sources:
  - title: "rust-skills: closure-move-capture"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/closure-move-capture.md
---
> Use `move` for closures that outlive the current scope; clone before `move` to keep the original

## Why

A closure that borrows its environment can only live as long as that environment. When a closure escapes — passed to a new thread, stored in a struct, or returned from a function — it must own its captures and typically must be `'static`. The `move` keyword transfers ownership of every captured variable into the closure. If you need the value in both the closure and the surrounding code, clone it first and move the clone.

## Bad

```rust
fn make_greeter_bad(name: String) -> impl Fn() {
    // `name` is borrowed, but the closure outlives the function frame —
    // the compiler rejects this with a lifetime error.
    // || println!("hello, {name}")  // error: `name` does not live long enough
    move || println!("hello, {name}") // must be move — shown here to illustrate the fix
}

fn spawn_bad() {
    let data = vec![1, 2, 3];
    // Borrowing `data` across a thread boundary is rejected:
    // std::thread::spawn(|| println!("{data:?}")); // error: borrowed value does not live long enough
    let _ = data; // suppress unused warning
}
```

## Good

```rust
fn process(data: &[i32]) -> i32 {
    data.iter().sum()
}

// Return a closure that owns its capture via `move`.
fn make_greeter(name: String) -> impl Fn() {
    move || println!("hello, {name}")
}

// Clone before `move` when you need the value in both places.
fn spawn_and_keep(data: Vec<i32>) -> std::thread::JoinHandle<i32> {
    let data_for_thread = data.clone(); // clone goes into the closure
    let handle = std::thread::spawn(move || process(&data_for_thread));
    println!("original still owned: {data:?}"); // `data` is still available
    handle
}

fn main() {
    make_greeter(String::from("world"))();
    let handle = spawn_and_keep(vec![10, 20, 30]);
    assert_eq!(handle.join().unwrap(), 60);
}
```

## See Also

- [rust-async-clone-before-await](async-clone-before-await.md) - Clone data before async move blocks
- [rust-own-move-large](own-move-large.md) - Move large data instead of cloning
- [rust-closure-disjoint-capture](closure-disjoint-capture.md) - Capture only the fields you use
