---
id: rust-mem-box-large-variant
lang: rust
prefix: mem
title: "Box large enum variants to reduce overall enum size"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["box", "large", "variant", "enum", "variants", "reduce", "overall", "size"]
  files: ["**/*.rs"]
related: ["rust-own-move-large", "rust-mem-smallvec", "rust-lint-deny-correctness"]
sources:
  - title: "rust-skills: mem-box-large-variant"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-box-large-variant.md
---
> Box large enum variants to reduce overall enum size

## Why

An enum's size is determined by its largest variant. If one variant contains a large struct while others are small, every instance of the enum pays for the largest variant's size. Boxing the large variant puts that data on the heap, keeping the enum itself small. This can significantly reduce memory usage and improve cache performance.

## Bad

```rust
enum Message {
    Quit,                              // 0 bytes of data
    Move { x: i32, y: i32 },          // 8 bytes
    Text(String),                      // 24 bytes
    Image { 
        data: [u8; 1024],             // 1024 bytes - forces entire enum to ~1032 bytes!
        width: u32, 
        height: u32 
    },
}

// Every Message is ~1032 bytes, even Quit and Move
fn main() {
    let messages: Vec<Message> = vec![
        Message::Quit,  // Wastes ~1032 bytes
        Message::Quit,  // Wastes ~1032 bytes
        Message::Move { x: 0, y: 0 },  // Wastes ~1024 bytes
    ];
}
```

## Good

```rust
struct ImageData {
    data: [u8; 1024],
    width: u32,
    height: u32,
}

enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Text(String),
    Image(Box<ImageData>),  // Now just 8 bytes (pointer)
}

// Message is now ~32 bytes (String variant is largest)
fn main() {
    let messages: Vec<Message> = vec![
        Message::Quit,  // Uses ~32 bytes
        Message::Quit,  // Uses ~32 bytes  
        Message::Move { x: 0, y: 0 },  // Uses ~32 bytes
    ];
}
```

## See Also

- [rust-own-move-large](own-move-large.md) - Boxing large types for cheap moves
- [rust-mem-smallvec](mem-smallvec.md) - Alternative for inline small collections
- [rust-lint-deny-correctness](lint-deny-correctness.md) - Enabling clippy lints
