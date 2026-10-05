---
id: rust-type-newtype-ids
lang: rust
prefix: type
title: "Wrap IDs in newtypes: `UserId(u64)`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["newtype", "ids", "wrap", "newtypes", "userid", "u64"]
  files: ["**/*.rs"]
  symbols: ["UserId"]
related: ["rust-api-newtype-safety", "rust-type-newtype-validated", "rust-api-parse-dont-validate", "rust-num-nonzero"]
sources:
  - title: "rust-skills: type-newtype-ids"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/type-newtype-ids.md
---
> Wrap IDs in newtypes: `UserId(u64)`

## Why

Using raw integers for IDs is error-prone. It's easy to accidentally pass a `user_id` where a `post_id` is expected. Newtypes make these mix-ups compile-time errors instead of runtime bugs.

## Bad

```rust
struct Post;

fn get_user_posts(user_id: u64, post_id: u64) -> Vec<Post> {
    // Which is which? Easy to swap by accident
    let _ = (user_id, post_id);
    Vec::new()
}

// Even worse with multiple IDs
fn transfer(from: u64, to: u64, amount: u64) {
    // from/to can easily be swapped
    let _ = (from, to, amount);
}

fn main() {
    let user_id = 1u64;
    let post_id = 2u64;

    // Oops! Arguments swapped - compiles fine, wrong at runtime
    let posts = get_user_posts(post_id, user_id);
    let _ = posts;
}
```

## Good

```rust
struct Post;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct UserId(pub u64);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct PostId(pub u64);

fn get_user_posts(user_id: UserId, post_id: PostId) -> Vec<Post> {
    // Types are distinct
    let _ = (user_id, post_id);
    Vec::new()
}

fn main() {
    // This won't compile - types don't match
    // let posts = get_user_posts(post_id, user_id);  // ERROR!

    // Correct usage
    let posts = get_user_posts(UserId(1), PostId(42));
    let _ = posts;
}
```

## See Also

- [rust-api-newtype-safety](api-newtype-safety.md) - Newtypes for type safety
- [rust-type-newtype-validated](type-newtype-validated.md) - Newtypes for validated data
- [rust-api-parse-dont-validate](api-parse-dont-validate.md) - Parse into validated types
- [rust-num-nonzero](num-nonzero.md) - NonZero* for never-zero ids
