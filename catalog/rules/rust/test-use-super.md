---
id: rust-test-use-super
lang: rust
prefix: test
title: "Use `use super::*;` in test modules to access parent module items"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["super", "test", "modules", "access", "parent", "module", "items"]
  files: ["**/*.rs"]
related: ["rust-test-cfg-test-module", "rust-test-integration-dir", "rust-proj-pub-crate-internal"]
sources:
  - title: "rust-skills: test-use-super"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-use-super.md
---
> Use `use super::*;` in test modules to access parent module items

## Why

The test module is a child of the module being tested. `use super::*` imports all items from the parent module, including private ones. This gives tests access to both public API and internal implementation details for thorough testing.

## Bad

```rust
mod my_module {
    pub struct MyStruct;

    pub fn public_function() -> i32 {
        42
    }

    // Verbose imports
    #[cfg(test)]
    mod tests {
        use crate::my_module::public_function;
        use crate::my_module::MyStruct;
        // Can't access private items this way!

        #[test]
        fn test_function() {
            let result = public_function();
            let _ = (result, MyStruct);
        }
    }
}
```

## Good

```rust
pub struct PublicStruct;

struct PrivateStruct;

impl PublicStruct {
    pub fn new() -> Self { PublicStruct }
}
impl PrivateStruct {
    fn new() -> Self { PrivateStruct }
}

pub fn public_function() -> i32 { 42 }
fn private_helper() -> i32 { 42 }

#[cfg(test)]
mod tests {
    use super::*;  // imports private items too

    #[test] fn test_public_struct() { let _ = PublicStruct::new(); }
    #[test] fn test_private_struct() { let _ = PrivateStruct::new(); }
    #[test] fn test_private_helper() { assert_eq!(private_helper(), 42); }
}
```

## See Also

- [rust-test-cfg-test-module](test-cfg-test-module.md) - Test module structure
- [rust-test-integration-dir](test-integration-dir.md) - Integration tests
- [rust-proj-pub-crate-internal](proj-pub-crate-internal.md) - Visibility modifiers
