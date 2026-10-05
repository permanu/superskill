---
id: rust-own-clone-explicit
lang: rust
prefix: own
title: "Use explicit `Clone` for types where copying has meaningful cost"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["clone", "explicit", "types", "copying", "meaningful", "cost"]
  files: ["**/*.rs"]
  symbols: ["Clone"]
related: ["rust-own-copy-small", "rust-own-cow-conditional", "rust-mem-clone-from"]
sources:
  - title: "rust-skills: own-clone-explicit"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/own-clone-explicit.md
---
> Use explicit `Clone` for types where copying has meaningful cost

## Why

Unlike `Copy` which is implicit and "free," `Clone` requires an explicit `.clone()` call, signaling that duplication has a cost. This makes heap allocations and deep copies visible in code, helping developers reason about performance. Types with heap data (`String`, `Vec`, `Box`) should implement `Clone` but not `Copy`.

## Bad

```rust
// Hiding expensive operations
fn process_data(data: Vec<u32>) -> Vec<u32> {
    let backup = data; // Moved, not copied - but unclear at call site
    transform(backup)
}

fn transform(data: impl AsRef<[u32]>) -> Vec<u32> {
    data.as_ref().to_vec()
}

fn main() {
    let my_data = vec![1, 2, 3, 4, 5];
    let result = process_data(my_data);
    // my_data is moved - surprise if you expected it to still exist
    println!("{:?}", result);
}
```

## Good

```rust
fn process_data(data: Vec<u32>) -> Vec<u32> {
    let backup = data; 
    transform(backup)
}

fn transform(data: impl AsRef<[u32]>) -> Vec<u32> {
    data.as_ref().to_vec()
}

// Or better - take reference if you don't need ownership
fn process_data_ref(data: &[u32]) -> Vec<u32> {
    transform(data)
}

fn main() {
    let my_data = vec![1, 2, 3, 4, 5];
    let result = process_data(my_data.clone()); // Explicit: "I know this allocates"
    // my_data still available
    let result2 = process_data_ref(&my_data); // No clone needed
    println!("{:?} {:?}", result, result2);
}
```

## See Also

- [rust-own-copy-small](own-copy-small.md) - When implicit Copy is appropriate
- [rust-own-cow-conditional](own-cow-conditional.md) - Avoiding clones with Cow
- [rust-mem-clone-from](mem-clone-from.md) - Optimizing repeated clones
