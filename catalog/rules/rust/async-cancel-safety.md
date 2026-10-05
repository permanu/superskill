---
id: rust-async-cancel-safety
lang: rust
prefix: async
title: "Ensure futures used in `tokio::select!` branches are cancellation-safe"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["cancel", "safety", "ensure", "futures", "used", "tokio", "select", "branches"]
  files: ["**/*.rs"]
  symbols: ["tokio::select"]
related: ["rust-async-select-racing", "rust-async-bounded-channel", "rust-async-no-lock-await"]
sources:
  - title: "rust-skills: async-cancel-safety"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/async-cancel-safety.md
---
> Ensure futures used in `tokio::select!` branches are cancellation-safe

## Why

`tokio::select!` polls multiple futures concurrently and, the moment one branch completes, it **drops every other branch** — including any state those futures held. A future that was halfway through reading bytes into a local buffer, or halfway through draining a channel into a `Vec`, loses that progress silently. This is not a compiler error; it compiles fine and the bug only surfaces under concurrent load. Tokio documents which of its primitives are cancellation-safe; everything else must be treated with care.

## Bad

```rust
use tokio::io::{AsyncReadExt, BufReader};
use tokio::net::TcpStream;
use tokio::sync::mpsc;

// Non-cancel-safe: `read_exact` owns an internal buffer inside the future.
// If select! drops this branch, the partially-read bytes are gone.
async fn bad_example(stream: &mut BufReader<TcpStream>, rx: &mut mpsc::Receiver<u8>) {
    let mut buf = [0u8; 1024];
    tokio::select! {
        // BUG: if the `recv` branch fires first, the bytes already read
        // into buf inside `read_exact` are silently discarded
        result = stream.read_exact(&mut buf) => {
            println!("read {} bytes", result.unwrap());
        }
        msg = rx.recv() => {
            println!("got message: {:?}", msg);
        }
    }
}
```

## Good

```rust
use tokio::{io::{AsyncReadExt, BufReader}, net::TcpStream, sync::mpsc};
// Cancel-safe: the buffer lives outside the select loop, so bytes
// read before the recv branch fires are not lost.
async fn good_example(
    stream: &mut BufReader<TcpStream>,
    rx: &mut mpsc::Receiver<u8>,
) -> std::io::Result<()> {
    let mut buf = [0u8; 1024];
    let mut filled = 0;
    loop {
        tokio::select! {
            // `read` is cancel-safe: reads some bytes or returns Ok(0).
            n = stream.read(&mut buf[filled..]) => {
                filled += n?;
                if filled == buf.len() {
                    filled = 0;
                }
            }
            msg = rx.recv() => {
                println!("got message: {msg:?}");
            }
        }
    }
}
```

## See Also

- [rust-async-select-racing](async-select-racing.md) - Use `tokio::select!` for racing/timeouts
- [rust-async-bounded-channel](async-bounded-channel.md) - Use bounded channels for backpressure
- [rust-async-no-lock-await](async-no-lock-await.md) - Never hold locks across `.await`
