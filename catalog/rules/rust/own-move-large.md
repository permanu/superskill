---
id: rust-own-move-large
lang: rust
prefix: own
title: "Move large types instead of copying; use `Box` if moves are expensive"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["move", "large", "types", "copying", "box", "moves", "expensive"]
  files: ["**/*.rs"]
  symbols: ["Box"]
related: ["rust-own-copy-small", "rust-mem-box-large-variant", "rust-perf-profile-first"]
sources:
  - title: "rust-skills: own-move-large"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/own-move-large.md
---
> Move large types instead of copying; use `Box` if moves are expensive

## Why

In Rust, "moving" a value means copying its bytes to a new location and invalidating the old one. For large types (hundreds of bytes), this memcpy can be expensive. Boxing large types reduces move cost to copying a single pointer (8 bytes), making moves cheap regardless of the actual data size.

## Bad

```rust
// Large struct moved repeatedly = expensive memcpy each time
struct GameState {
    board: [[u8; 100]; 100],  // 10,000 cells
    history: [u64; 1000],     // 1,000 moves
    players: [u32; 4],
}

impl GameState {
    fn new() -> Self {
        GameState { board: [[0; 100]; 100], history: [0; 1000], players: [0; 4] }
    }
    fn apply_rules(&mut self) {}
}

fn process_state(state: GameState) -> GameState {
    // Moving tens of KB of data
    let mut new_state = state;  // Memcpy here
    new_state.apply_rules();
    new_state  // Memcpy on return
}

fn main() {
    let state = process_state(GameState::new());  // Two large memcpys
}
```

## Good

```rust
// Box reduces move cost to copying a pointer
struct GameState {
    board: Box<[[u8; 100]; 100]>,  // Pointer to heap
    history: Vec<u64>,             // Heap-allocated
    players: [u32; 4],
}

impl GameState {
    fn new() -> Self {
        GameState { board: Box::new([[0; 100]; 100]), history: Vec::new(), players: [0; 4] }
    }
    fn apply_rules(&mut self) {}
}

fn process_state(mut state: GameState) -> GameState {
    // Moving just pointers + small inline data
    state.apply_rules();
    state  // Cheap move
}

fn main() {
    let state = process_state(GameState::new());
    let _ = state;
}
```

## See Also

- [rust-own-copy-small](own-copy-small.md) - Cheap types should be Copy
- [rust-mem-box-large-variant](mem-box-large-variant.md) - Boxing enum variants
- [rust-perf-profile-first](perf-profile-first.md) - Measure before optimizing
