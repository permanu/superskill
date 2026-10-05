---
id: rust-mem-arena-allocator
lang: rust
prefix: mem
title: "Use arena allocators for batch allocations"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["arena", "allocator", "allocators", "batch", "allocations"]
  files: ["**/*.rs"]
related: ["rust-mem-with-capacity", "rust-mem-reuse-collections", "rust-perf-profile-first"]
sources:
  - title: "rust-skills: mem-arena-allocator"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-arena-allocator.md
  - title: "bumpalo: a fast bump allocation arena for Rust"
    url: https://docs.rs/bumpalo/latest/bumpalo/
---
> Use arena allocators for batch allocations

## Why

Arena allocators (bump allocators) allocate memory from a contiguous region, making allocation extremely fast (just bump a pointer). All allocations are freed at once when the arena is dropped. Perfect for request-scoped or parse-tree allocations.

## Bad

```rust
struct Node {
    token: String,
}

struct Request;
struct Response;

// Many small heap allocations during parsing
fn parse(input: &str) -> Vec<Box<Node>> {
    let mut nodes = Vec::new();
    for token in input.split_whitespace() {
        nodes.push(Box::new(Node { token: token.to_string() }));  // Heap alloc per node!
    }
    nodes
}

// Per-request allocations add up
fn handle_request(_req: Request) -> Response {
    let _headers = parse("headers");  // Allocates a Vec plus a Box per token
    let _body = parse("body");        // Allocates again
    Response
}
```

## Good

```rust
use bumpalo::Bump;

struct Node {
    token: String,
}

struct Request;
struct Response;

fn parse<'a>(input: &str, arena: &'a Bump) -> Vec<&'a Node> {
    let mut nodes = Vec::new();
    for token in input.split_whitespace() {
        let node: &Node = arena.alloc(Node { token: token.to_string() });  // Fast bump!
        nodes.push(node);
    }
    nodes
}  // Arena frees all nodes at once

// Per-request arena
fn handle_request(_req: Request) -> Response {
    let arena = Bump::new();
    let _headers = parse("headers", &arena);
    let _body = parse("body", &arena);
    Response
}  // All request memory freed instantly
```

## See Also

- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocate when size is known
- [rust-mem-reuse-collections](mem-reuse-collections.md) - Reuse collections with clear()
- [rust-perf-profile-first](perf-profile-first.md) - Profile to verify benefit
