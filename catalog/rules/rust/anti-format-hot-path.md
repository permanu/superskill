---
id: rust-anti-format-hot-path
lang: rust
prefix: anti
title: "Don't use format! in hot paths"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["format", "hot", "path", "don", "paths"]
  files: ["**/*.rs"]
related: ["rust-mem-avoid-format", "rust-mem-write-over-format", "rust-mem-reuse-collections"]
sources:
  - title: "rust-skills: anti-format-hot-path"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-format-hot-path.md
---
> Don't use format! in hot paths

## Why

`format!()` allocates a new `String` every call. In hot paths (loops, frequently called functions), this creates allocation churn that impacts performance. Pre-allocate, reuse buffers, or use `write!()` to an existing buffer.

## Bad

```rust
struct Event { level: String, source: String, message: String }

fn log(_message: &str) {}

fn log_events(events: &[Event]) {
    for event in events {
        // format! allocates a new String every iteration
        log(&format!("[{}] {}: {}", event.level, event.source, event.message));
    }
}

fn build_url(base: &str, path: &str, params: &[(&str, &str)]) -> String {
    let mut url = format!("{}{}", base, path);
    for (key, value) in params {
        url = format!("{}{}={}&", url, key, value); // New allocation each time
    }
    url
}
```

## Good

```rust
use std::fmt::Write;

struct Event { level: String, source: String, message: String }

fn log(_message: &str) {}

fn log_events(events: &[Event]) {
    let mut buffer = String::with_capacity(256);
    for event in events {
        buffer.clear();
        write!(buffer, "[{}] {}: {}", event.level, event.source, event.message).unwrap();
        log(&buffer);
    }
}

fn build_url(base: &str, path: &str, params: &[(&str, &str)]) -> String {
    let mut url = String::with_capacity(base.len() + path.len() + params.len() * 20);
    url.push_str(base);
    url.push_str(path);
    for (key, value) in params {
        write!(url, "{}={}&", key, value).unwrap();
    }
    url
}
```

## See Also

- [rust-mem-avoid-format](mem-avoid-format.md) - Avoiding format
- [rust-mem-write-over-format](mem-write-over-format.md) - Using write!
- [rust-mem-reuse-collections](mem-reuse-collections.md) - Buffer reuse
