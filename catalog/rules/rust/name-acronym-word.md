---
id: rust-name-acronym-word
lang: rust
prefix: name
title: "Treat acronyms as words in identifiers: `HttpServer`, not `HTTPServer`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["acronym", "word", "treat", "acronyms", "words", "identifiers", "httpserver"]
  files: ["**/*.rs"]
  symbols: ["HttpServer", "HTTPServer"]
related: ["rust-name-types-camel", "rust-name-funcs-snake", "rust-name-consts-screaming"]
sources:
  - title: "rust-skills: name-acronym-word"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-acronym-word.md
---
> Treat acronyms as words in identifiers: `HttpServer`, not `HTTPServer`

## Why

When acronyms are written in ALL CAPS within identifiers, word boundaries become unclear: is `HTTPSHandler` "HTTPS Handler" or "HTTP SHandler"? Treating acronyms as words (`HttpsHandler`) maintains clear word boundaries and follows Rust convention. The standard library uses this consistently.

## Bad

```rust
// ALL CAPS acronyms - unclear word boundaries
struct HTTPServer;      // HTTP + Server or H + TTP + Server?
struct TCPIPConnection; // TCP + IP? Or other splits?
struct JSONParser;
struct XMLHTTPRequest;  // Very confusing

fn parseJSON(input: &str) {
    let _ = input;
}
fn connectTCP(addr: &str) {
    let _ = addr;
}
```

## Good

```rust
// Acronyms as words - clear boundaries
struct HttpServer;      // Http + Server
struct TcpIpConnection; // Tcp + Ip + Connection
struct JsonParser;
struct XmlHttpRequest;

fn parse_json(input: &str) {
    let _ = input;
}
fn connect_tcp(addr: &str) {
    let _ = addr;
}

// More examples
struct Uuid;            // Not UUID
struct Uri;             // Not URI
struct Url;             // Not URL
struct Html;            // Not HTML
struct Css;             // Not CSS
struct Api;             // Not API
```

## See Also

- [rust-name-types-camel](name-types-camel.md) - Type naming conventions
- [rust-name-funcs-snake](name-funcs-snake.md) - Function naming conventions
- [rust-name-consts-screaming](name-consts-screaming.md) - Constant naming
