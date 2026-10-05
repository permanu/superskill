---
id: rust-async-tokio-fs
lang: rust
prefix: async
title: "Use `tokio::fs` instead of `std::fs` in async code"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["tokio", "std", "async", "code"]
  files: ["**/*.rs"]
  symbols: ["tokio::fs", "std::fs"]
related: ["rust-async-spawn-blocking", "rust-async-tokio-runtime", "rust-err-context-chain"]
sources:
  - title: "rust-skills: async-tokio-fs"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-tokio-fs.md
---
> Use `tokio::fs` instead of `std::fs` in async code

## Why

`std::fs` operations are blocking—they stop the current thread until the syscall completes. In async code, this blocks the executor thread, preventing it from running other tasks. `tokio::fs` wraps filesystem operations in `spawn_blocking`, keeping the executor responsive.

## Bad

```rust
use std::io::Result;
use std::path::PathBuf;

async fn process_files(paths: &[PathBuf]) -> Result<Vec<String>> {
    let mut contents = Vec::new();
    
    for path in paths {
        // BLOCKS the entire executor thread!
        let data = std::fs::read_to_string(path)?;
        contents.push(data);
    }
    
    Ok(contents)
}

// While reading a file, NO other tasks can run on this thread
```

## Good

```rust
use std::io::Result;
use std::path::PathBuf;
use tokio::fs;

async fn process_files(paths: &[PathBuf]) -> Result<Vec<String>> {
    let mut contents = Vec::new();
    
    for path in paths {
        // Non-blocking: allows other tasks to run
        let data = fs::read_to_string(path).await?;
        contents.push(data);
    }
    
    Ok(contents)
}

// Even better: concurrent reads
async fn process_files_concurrent(paths: &[PathBuf]) -> Result<Vec<String>> {
    let futures: Vec<_> = paths.iter()
        .map(|path| fs::read_to_string(path))
        .collect();
    
    futures::future::try_join_all(futures).await
}
```

## See Also

- [rust-async-spawn-blocking](async-spawn-blocking.md) - How tokio::fs works internally
- [rust-async-tokio-runtime](async-tokio-runtime.md) - Runtime configuration
- [rust-err-context-chain](err-context-chain.md) - Adding path context to IO errors
