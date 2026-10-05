---
id: rust-api-newtype-safety
lang: rust
prefix: api
title: "Use newtypes to prevent mixing semantically different values"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["newtype", "safety", "newtypes", "prevent", "mixing", "semantically", "different", "values"]
  files: ["**/*.rs"]
related: ["rust-type-newtype-ids", "rust-api-parse-dont-validate", "rust-own-copy-small"]
sources:
  - title: "rust-skills: api-newtype-safety"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-newtype-safety.md
---
> Use newtypes to prevent mixing semantically different values

## Why

Raw primitives like `u64` or `String` carry no semantic meaning. A function taking `(u64, u64)` can easily be called with arguments swapped. Newtypes wrap primitives in distinct types, making the compiler catch mistakes at compile time rather than runtime.

## Bad

```rust
struct User {
    id: u64,
    group_id: u64,
    created_at: u64,  // Unix timestamp
}

fn add_user_to_group(user_id: u64, group_id: u64) {
    let _ = (user_id, group_id);
}

fn main() {
    // Bug: arguments swapped - compiles fine, fails at runtime
    let user = User { id: 100, group_id: 5, created_at: 1234567890 };
    add_user_to_group(user.group_id, user.id);  // Silent bug!

    // Bug: wrong field used - timestamp passed as ID
    add_user_to_group(user.created_at, user.group_id);  // Compiles fine!
}
```

## Good

```rust
struct UserId(u64);
struct GroupId(u64);
struct Timestamp(u64);

struct User {
    id: UserId,
    group_id: GroupId,
    created_at: Timestamp,
}

fn add_user_to_group(user_id: UserId, group_id: GroupId) {
    let _ = (user_id, group_id);
}

fn main() {
    let user = User {
        id: UserId(100),
        group_id: GroupId(5),
        created_at: Timestamp(1234567890),
    };

    // Both of these are compile errors now
    // add_user_to_group(user.group_id, user.id);
    // add_user_to_group(user.created_at, user.group_id);
}
```

## See Also

- [rust-type-newtype-ids](type-newtype-ids.md) - Newtype pattern for IDs
- [rust-api-parse-dont-validate](api-parse-dont-validate.md) - Type-driven validation
- [rust-own-copy-small](own-copy-small.md) - Making newtypes Copy
