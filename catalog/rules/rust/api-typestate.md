---
id: rust-api-typestate
lang: rust
prefix: api
title: "Use typestate pattern to encode state machine invariants in the type system"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["typestate", "pattern", "encode", "state", "machine", "invariants", "type", "system"]
  files: ["**/*.rs"]
related: ["rust-api-builder-pattern", "rust-api-parse-dont-validate", "rust-api-sealed-trait"]
sources:
  - title: "rust-skills: api-typestate"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-typestate.md
---
> Use typestate pattern to encode state machine invariants in the type system

## Why

State machines with runtime state checks ("are we connected?", "is the transaction started?") can have invalid transitions. The typestate pattern uses different types for each state, making invalid state transitions compile errors. The compiler enforces your state machine.

## Bad

```rust
enum State { Disconnected, Connected, Authenticated }

#[derive(Debug)] struct NotAuthenticated;

struct Connection { state: State }

impl Connection {
    fn new() -> Self { Connection { state: State::Disconnected } }
    fn connect(&mut self) { self.state = State::Connected; }
    fn authenticate(&mut self, _password: &str) { self.state = State::Authenticated; }
    fn send(&mut self, _data: &[u8]) -> Result<(), NotAuthenticated> {
        // Runtime check — can fail if called in the wrong state
        if !matches!(self.state, State::Authenticated) {
            return Err(NotAuthenticated);
        }
        Ok(())
    }
}

fn main() {
    let mut conn = Connection::new();
    conn.connect();
    // Forgot to authenticate — compiles fine, fails at runtime
    conn.send(b"data").unwrap();
}
```

## Good

```rust
struct Disconnected;
struct Connected;
struct Authenticated;

struct Connection<State>(State);

impl Connection<Disconnected> {
    fn new() -> Self { Connection(Disconnected) }
    fn connect(self, _addr: &str) -> Connection<Connected> { Connection(Connected) }
}
impl Connection<Connected> {
    fn authenticate(self, _password: &str) -> Connection<Authenticated> {
        Connection(Authenticated)
    }
}
impl Connection<Authenticated> {
    fn send(&mut self, _data: &[u8]) {
        // No runtime check: the type guarantees authentication
    }
}

fn main() {
    let mut conn = Connection::new().connect("server:8080").authenticate("secret");
    conn.send(b"data"); // OK: send() exists only on Connection<Authenticated>
}
```

## See Also

- [rust-api-builder-pattern](api-builder-pattern.md) - Basic builder pattern
- [rust-api-parse-dont-validate](api-parse-dont-validate.md) - Type-driven invariants
- [rust-api-sealed-trait](api-sealed-trait.md) - Restricting trait implementations
