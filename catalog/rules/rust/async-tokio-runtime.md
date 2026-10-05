---
id: rust-async-tokio-runtime
lang: rust
prefix: async
title: "Configure Tokio runtime appropriately for your workload"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["tokio", "runtime", "configure", "appropriately", "workload"]
  files: ["**/*.rs"]
related: ["rust-async-spawn-blocking", "rust-async-no-lock-await", "rust-async-joinset-structured"]
sources:
  - title: "rust-skills: async-tokio-runtime"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-tokio-runtime.md
---
> Configure Tokio runtime appropriately for your workload

## Why

Tokio's default multi-threaded runtime isn't always optimal. CPU-bound work needs different configuration than IO-bound work. Incorrect configuration leads to poor performance, blocked workers, or resource exhaustion. Understanding runtime options lets you tune for your specific use case.

## Bad

```rust
struct Dataset;

async fn heavy_computation(_data: Dataset) {}

// Default runtime for everything - not optimal
#[tokio::main]
async fn main() {
    let datasets = vec![Dataset];
    // CPU-heavy work on async executor starves IO tasks
    for data in datasets {
        let result = heavy_computation(data).await;
        let _ = result;
    }
}

// Single-threaded when multi-threaded is needed
#[tokio::main(flavor = "current_thread")]
async fn run_single_threaded() {
    // Can't utilize multiple cores for concurrent tasks
    for _ in 0..1000 {
        tokio::spawn(async { /* IO work */ });
    }
}
```

## Good

```rust
// Multi-threaded (default): best for many concurrent IO tasks
#[tokio::main]
async fn run_default() { tokio::spawn(async { /* io work */ }); }

// Current-thread: single connection, simpler debugging
#[tokio::main(flavor = "current_thread")]
async fn run_current_thread() { tokio::spawn(async { /* io work */ }); }

// Limit worker threads via attribute config
#[tokio::main(worker_threads = 4)]
async fn run_configured() {}

// Manual setup when you need full control
fn main() {
    let rt = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(4)
        .enable_all()
        .build()
        .unwrap();
    rt.block_on(async { /* submit work */ });
}
```

## See Also

- [rust-async-spawn-blocking](async-spawn-blocking.md) - Handling blocking code
- [rust-async-no-lock-await](async-no-lock-await.md) - Avoiding lock issues
- [rust-async-joinset-structured](async-joinset-structured.md) - Managing spawned tasks
