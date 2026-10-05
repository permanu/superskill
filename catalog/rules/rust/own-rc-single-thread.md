---
id: rust-own-rc-single-thread
lang: rust
prefix: own
title: "Use `Rc<T>` for shared ownership in single-threaded contexts"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["single", "thread", "shared", "ownership", "single-threaded", "contexts"]
  files: ["**/*.rs"]
  symbols: ["Rc"]
related: ["rust-own-arc-shared", "rust-own-refcell-interior", "rust-conc-thread-local", "rust-mem-drop-order"]
sources:
  - title: "rust-skills: own-rc-single-thread"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/own-rc-single-thread.md
---
> Use `Rc<T>` for shared ownership in single-threaded contexts

## Why

`Rc<T>` (Reference Counted) provides shared ownership without the atomic overhead of `Arc<T>`. In single-threaded code, `Rc` is faster because it uses non-atomic reference counting. Using `Arc` when you don't need thread-safety wastes CPU cycles on unnecessary synchronization.

## Bad

```rust
use std::cell::RefCell;
use std::sync::Arc;

struct Node {
    name: String,
    children: RefCell<Vec<Arc<Node>>>,
}

impl Node {
    fn new(name: &str) -> Self {
        Node { name: name.to_string(), children: RefCell::new(Vec::new()) }
    }
    fn add_child(&self, child: Arc<Node>) {
        self.children.borrow_mut().push(child);
    }
}

// Single-threaded application paying atomic overhead with Arc
fn build_tree() -> Arc<Node> {
    let root = Arc::new(Node::new("root"));
    let child = Arc::new(Node::new("child"));
    root.add_child(child.clone());
    root.add_child(child);
    root
}
```

## Good

```rust
use std::cell::RefCell;
use std::rc::Rc;

struct Node {
    name: String,
    children: RefCell<Vec<Rc<Node>>>,
}

impl Node {
    fn new(name: &str) -> Self {
        Node { name: name.to_string(), children: RefCell::new(Vec::new()) }
    }
    fn add_child(&self, child: Rc<Node>) {
        self.children.borrow_mut().push(child);
    }
}

// Single-threaded: use Rc for zero atomic overhead
fn build_tree() -> Rc<Node> {
    let root = Rc::new(Node::new("root"));
    let child = Rc::new(Node::new("child"));
    root.add_child(child.clone());
    root.add_child(child);
    root
}
```

## See Also

- [rust-own-arc-shared](own-arc-shared.md) - When you need thread-safe sharing
- [rust-own-refcell-interior](own-refcell-interior.md) - Combining Rc with interior mutability
- [rust-conc-thread-local](conc-thread-local.md) - Per-thread state in single-threaded-style code
- [rust-mem-drop-order](mem-drop-order.md) - Drop order matters for cyclic/`Weak` structures
