---
id: rust-test-mockall-mocking
lang: rust
prefix: test
title: "Use mockall for trait mocking"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["mockall", "mocking", "trait"]
  files: ["**/*.rs"]
related: ["rust-test-mock-traits", "rust-test-proptest-properties", "rust-test-arrange-act-assert"]
sources:
  - title: "rust-skills: test-mockall-mocking"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-mockall-mocking.md
---
> Use mockall for trait mocking

## Why

Unit tests should isolate the code under test from external dependencies (databases, APIs, file systems). Mockall generates mock implementations of traits, allowing you to control and verify behavior without real dependencies.

## Bad

```rust
trait Database {
    fn get(&self, id: u64) -> Option<String>;
    fn set(&mut self, id: u64, value: String);
}

// Hand-rolled mock: hard-coded behaviour, edited per test.
struct FakeDb;

impl Database for FakeDb {
    fn get(&self, _id: u64) -> Option<String> {
        Some("canned value".to_string())
    }
    fn set(&mut self, _id: u64, _value: String) {}
}

fn main() {
    let mut db = FakeDb;
    db.set(1, "x".to_string());
    assert!(db.get(1).is_some());
}
```

## Good

```rust
use mockall::automock;

struct User { id: u64, name: String }

#[automock]
trait Database {
    fn get_user(&self, id: u64) -> Option<User>;
}

struct UserService<D: Database> { db: D }
impl<D: Database> UserService<D> { fn find_user(&self, id: u64) -> Option<User> { self.db.get_user(id) } }

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::predicate::eq;

    #[test]
    fn get_user_returns_matching_user() {
        let mut mock = MockDatabase::new();
        mock.expect_get_user().with(eq(42)).returning(|_| Some(User { id: 42, name: "Alice".into() }));
        let service = UserService { db: mock };
        assert_eq!(service.find_user(42).unwrap().name, "Alice");
    }
}
```

## See Also

- [rust-test-mock-traits](test-mock-traits.md) - Mock trait design
- [rust-test-proptest-properties](test-proptest-properties.md) - Property testing
- [rust-test-arrange-act-assert](test-arrange-act-assert.md) - Test structure
