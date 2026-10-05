---
id: rust-type-enum-states
lang: rust
prefix: type
title: "Use enums for mutually exclusive states"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["enum", "states", "enums", "mutually", "exclusive"]
  files: ["**/*.rs"]
related: ["rust-api-typestate", "rust-api-non-exhaustive", "rust-type-option-nullable", "rust-pat-exhaustive-enum", "rust-serde-enum-representation"]
sources:
  - title: "rust-skills: type-enum-states"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/type-enum-states.md
---
> Use enums for mutually exclusive states

## Why

When a value can be in exactly one of several states, an enum makes invalid states unrepresentable. The compiler ensures all states are handled. Contrast with boolean flags or optional fields that can represent impossible combinations.

## Bad

```rust
use std::net::TcpStream;

struct Credentials;

struct Connection {
    is_connected: bool,
    is_authenticated: bool,
    is_disconnected: bool,  // Can all three be true? False?
    socket: Option<TcpStream>,
    credentials: Option<Credentials>,
}

// Possible invalid states:
// - is_connected && is_disconnected (contradiction)
// - is_authenticated && !is_connected (impossible)
// - socket is None but is_connected is true (inconsistent)
```

## Good

```rust
use std::net::{SocketAddr, TcpStream};

struct Session;
struct ConnectionError;

enum ConnectionState {
    Disconnected,
    Connecting { address: SocketAddr },
    Connected { socket: TcpStream },
    Authenticated { socket: TcpStream, session: Session },
    Failed { error: ConnectionError },
}

struct Connection {
    state: ConnectionState,
}

// Impossible states are unrepresentable
// Each state has exactly the data it needs
```

## See Also

- [rust-api-typestate](api-typestate.md) - Type-level state machines
- [rust-api-non-exhaustive](api-non-exhaustive.md) - Forward-compatible enums
- [rust-type-option-nullable](type-option-nullable.md) - Option for optional values
- [rust-pat-exhaustive-enum](pat-exhaustive-enum.md) - Match owned enums exhaustively
- [rust-serde-enum-representation](serde-enum-representation.md) - Choose enum wire tagging
