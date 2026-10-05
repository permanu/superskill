---
id: rust-mem-write-over-format
lang: rust
prefix: mem
title: "Use `write!()` into existing buffers instead of `format!()` allocations"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["write", "format", "existing", "buffers", "allocations"]
  files: ["**/*.rs"]
  symbols: ["write", "format"]
related: ["rust-mem-avoid-format", "rust-mem-reuse-collections", "rust-mem-with-capacity"]
sources:
  - title: "rust-skills: mem-write-over-format"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-write-over-format.md
---
> Use `write!()` into existing buffers instead of `format!()` allocations

## Why

`format!()` always allocates a new `String`. In hot paths or loops, these allocations add up. `write!()` writes directly into an existing buffer, reusing its capacity. For high-frequency formatting operations, this can eliminate significant allocator overhead.

## Bad

```rust
struct Event {
    timestamp: u64,
    level: &'static str,
    message: String,
}

fn log_event(event: &Event, output: &mut Vec<u8>) {
    // format! allocates a fresh String on every call
    let line = format!("[{}] {}: {}\n", event.timestamp, event.level, event.message);
    output.extend_from_slice(line.as_bytes());
}

fn build_response(items: &[(String, i32)]) -> String {
    let mut result = String::new();
    for (name, value) in items {
        // format! allocates for each item
        result.push_str(&format!("{name}: {value}\n"));
    }
    result
}
```

## Good

```rust
use std::fmt::Write;

struct Event {
    timestamp: u64,
    level: &'static str,
    message: String,
}

fn log_event(event: &Event, output: &mut Vec<u8>) {
    use std::io::Write;
    // write! into the existing Vec<u8>: no intermediate String
    write!(output, "[{}] {}: {}\n", event.timestamp, event.level, event.message).unwrap();
}

fn build_response(items: &[(String, i32)]) -> String {
    let mut result = String::with_capacity(items.len() * 64);
    for (name, value) in items {
        // write! reuses the String's capacity
        write!(&mut result, "{name}: {value}\n").unwrap();
    }
    result
}
```

## See Also

- [rust-mem-avoid-format](mem-avoid-format.md) - General format! avoidance patterns
- [rust-mem-reuse-collections](mem-reuse-collections.md) - Reusing buffers in loops
- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocating string capacity
