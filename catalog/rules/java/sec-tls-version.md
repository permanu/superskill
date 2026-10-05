---
id: java-sec-tls-version
lang: java
prefix: sec
title: "Request TLS 1.3 or default negotiation, not a legacy protocol version"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tls, sslcontext, protocol, version]
  files: ["**/*.java"]
  symbols: [SSLContext]
related: [java-sec-tls-verify]
sources:
  - title: "JEP 332: Transport Layer Security (TLS) 1.3"
    url: https://openjdk.org/jeps/332
---
> Let the context negotiate the best protocol instead of pinning an obsolete one.

## Why

JEP 332 describes TLS 1.3 as "a major overhaul of the TLS protocol" that "provides significant security and performance improvements over previous versions" and "supersedes and obsoletes previous versions of TLS including version 1.2". Pinning an SSLContext to an old version such as "TLSv1" opts out of those improvements and relies on protocol versions that the JDK disables by default for good reason.

## Bad

```java
import javax.net.ssl.SSLContext;

class Client {
    SSLContext context() throws Exception {
        return SSLContext.getInstance("TLSv1");
    }
}
```

## Good

```java
import javax.net.ssl.SSLContext;

class Client {
    SSLContext context() throws Exception {
        return SSLContext.getInstance("TLS");
    }
}
```

## See Also

- [java-sec-tls-verify](sec-tls-verify.md) - the peer checks that make the protocol meaningful
