---
id: rust-proj-pub-crate-internal
lang: rust
prefix: proj
title: "Use pub(crate) for internal APIs"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["pub", "crate", "internal", "apis"]
  files: ["**/*.rs"]
related: ["rust-proj-pub-super-parent", "rust-proj-pub-use-reexport", "rust-api-non-exhaustive"]
sources:
  - title: "rust-skills: proj-pub-crate-internal"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/proj-pub-crate-internal.md
---
> Use pub(crate) for internal APIs

## Why

`pub(crate)` exposes items within the crate but hides them from external users. This creates clear boundaries between public API and internal implementation, preventing accidental breakage and reducing public API surface.

## Bad

```rust
// Everything public - users depend on internals
pub mod internal {
    pub struct InternalState {
        pub buffer: Vec<u8>,    // Implementation detail exposed
        pub dirty: bool,
    }
    
    pub fn process_internal(state: &mut InternalState) {
        // Users can call this, creating coupling
    }
}

pub struct Widget {
    pub state: internal::InternalState,  // Exposed!
}
```

## Good

```rust
// Internal module with crate visibility
pub(crate) mod internal {
    pub(crate) struct InternalState {
        pub(crate) buffer: Vec<u8>,
        pub(crate) dirty: bool,
    }

    pub(crate) fn process_internal(_state: &mut InternalState) {}
}

pub struct Widget {
    state: internal::InternalState,  // Private field
}

impl Widget {
    pub fn new() -> Self {
        Self { state: internal::InternalState { buffer: Vec::new(), dirty: false } }
    }

    pub fn do_something(&mut self) {
        internal::process_internal(&mut self.state);
    }
}
```

## See Also

- [rust-proj-pub-super-parent](proj-pub-super-parent.md) - Parent-only visibility
- [rust-proj-pub-use-reexport](proj-pub-use-reexport.md) - Clean re-exports
- [rust-api-non-exhaustive](api-non-exhaustive.md) - Future-proof structs
