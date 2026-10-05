---
id: rust-async-spawn-blocking
lang: rust
prefix: async
title: "Use `spawn_blocking` for CPU-intensive work"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["spawn", "blocking", "spawn_blocking", "cpu-intensive", "work"]
  files: ["**/*.rs"]
  symbols: ["spawn_blocking"]
related: ["rust-async-tokio-fs", "rust-async-no-lock-await"]
sources:
  - title: "rust-skills: async-spawn-blocking"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-spawn-blocking.md
---
> Use `spawn_blocking` for CPU-intensive work

## Why

Async runtimes like Tokio use a small number of threads to handle many tasks. CPU-intensive or blocking operations on these threads starve other tasks. `spawn_blocking` moves such work to a dedicated thread pool.

## Bad

```rust
use std::path::Path;

struct ProcessedImage;

fn resize_image(_data: &[u8]) -> Vec<u8> {
    Vec::new()
}
fn compress(_data: Vec<u8>) -> ProcessedImage {
    ProcessedImage
}

// BAD: Blocks the async runtime thread
async fn process_image(data: &[u8]) -> ProcessedImage {
    // CPU-intensive work on async thread!
    let resized = resize_image(data);      // Blocks!
    let compressed = compress(resized);     // Blocks!
    compressed
}

// BAD: Synchronous file I/O in async context
async fn read_large_file(path: &Path) -> Vec<u8> {
    std::fs::read(path).unwrap()  // Blocks the runtime!
}
```

## Good

```rust
use std::path::{Path, PathBuf};
use tokio::task;

struct ProcessedImage;
fn resize_image(_data: &[u8]) -> Vec<u8> { Vec::new() }
fn compress(_data: Vec<u8>) -> ProcessedImage { ProcessedImage }

// Offload CPU work to the blocking pool
async fn process_image(data: Vec<u8>) -> ProcessedImage {
    task::spawn_blocking(move || compress(resize_image(&data)))
        .await
        .expect("spawn_blocking failed")
}

// Use async file I/O for plain reads
async fn read_large_file(path: &Path) -> tokio::io::Result<Vec<u8>> {
    tokio::fs::read(path).await
}

// Or spawn_blocking for unavoidable sync I/O
async fn read_with_sync_lib(path: PathBuf) -> Vec<u8> {
    task::spawn_blocking(move || std::fs::read(&path).unwrap_or_default())
        .await
        .unwrap()
}
```

## See Also

- [rust-async-tokio-fs](async-tokio-fs.md) - Use tokio::fs for async file I/O
- [rust-async-no-lock-await](async-no-lock-await.md) - Don't hold locks across await
