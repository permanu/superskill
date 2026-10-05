---
id: rust-test-mock-traits
lang: rust
prefix: test
title: "Use traits for dependencies to enable mocking in tests"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["mock", "traits", "dependencies", "enable", "mocking", "tests"]
  files: ["**/*.rs"]
related: ["rust-api-sealed-trait", "rust-test-proptest-properties", "rust-proj-lib-main-split"]
sources:
  - title: "rust-skills: test-mock-traits"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-mock-traits.md
---
> Use traits for dependencies to enable mocking in tests

## Why

Concrete dependencies make testing hard—you can't easily test error paths, timeouts, or edge cases without real external systems. Extracting dependencies behind traits lets you inject test doubles (mocks, fakes, stubs), enabling isolated unit tests that run fast and cover edge cases.

## Bad

```rust
struct User;
#[derive(Debug)] struct Error;

struct PostgresConnection;

impl PostgresConnection {
    async fn connect(_url: &str) -> Result<Self, Error> { Ok(PostgresConnection) }
    async fn query(&self, _sql: &str, _id: u64) -> Result<User, Error> { Ok(User) }
}

struct UserService {
    db: PostgresConnection,  // concrete type: hard to test
}

impl UserService {
    async fn get_user(&self, id: u64) -> Result<User, Error> {
        self.db.query("SELECT * FROM users WHERE id = $1", id).await
    }
}

#[tokio::test]
async fn test_get_user() {
    let db = PostgresConnection::connect("postgres://localhost").await.unwrap();
    let _service = UserService { db };  // slow, flaky, cannot test error paths
}
```

## Good

```rust
#[derive(Clone)]
struct User { id: u64 }

trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: u64) -> Option<User>;
}

// Service depends on the trait, not a concrete database type.
struct UserService<R: UserRepository> { repo: R }

impl<R: UserRepository> UserService<R> {
    async fn get_user(&self, id: u64) -> Option<User> { self.repo.find_by_id(id).await }
}

struct MockUserRepo;

impl UserRepository for MockUserRepo {
    async fn find_by_id(&self, _id: u64) -> Option<User> { Some(User { id: 42 }) }
}

#[tokio::test]
async fn test_with_mock() {
    let service = UserService { repo: MockUserRepo };
    assert_eq!(service.get_user(1).await.unwrap().id, 42);
}
```

## See Also

- [rust-api-sealed-trait](api-sealed-trait.md) - Trait design
- [rust-test-proptest-properties](test-proptest-properties.md) - Property-based testing
- [rust-proj-lib-main-split](proj-lib-main-split.md) - Testable architecture
