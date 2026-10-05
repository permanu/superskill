---
id: python-sec-ssl-verify
lang: python
prefix: sec
title: Build TLS contexts with ssl.create_default_context so certificates are verified
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ssl, tls, certificate, verify, create_default_context]
  files: ["**/*.py"]
  symbols: [ssl.create_default_context, ssl.SSLContext]
related: [python-sec-subprocess-no-shell]
sources:
  - title: ssl - Context creation and Security considerations
    url: https://docs.python.org/3/library/ssl.html
  - title: Security Considerations
    url: https://docs.python.org/3/library/security_warnings.html
---

> Build TLS with ssl.create_default_context; never disable certificate verification.

## Why

`create_default_context` enables certificate verification and hostname checking with the module's current secure defaults, and `PROTOCOL_TLS_CLIENT` enables `CERT_REQUIRED` with `check_hostname` by default. Setting `verify_mode` to `CERT_NONE` together with `check_hostname = False` overrides that and accepts just about any certificate, so a network attacker can impersonate the server. The ssl docs note that `CERT_NONE` is the default mode for contexts other than `PROTOCOL_TLS_CLIENT` and warn that the module's default settings are not necessarily appropriate for an application.

## Bad

```python
import socket
import ssl


def fetch(host: str) -> bytes:
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    # Explicitly override the secure defaults.
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    with socket.create_connection((host, 443)) as sock:
        with context.wrap_socket(sock, server_hostname=host) as tls:
            tls.sendall(b"GET / HTTP/1.1\r\nHost: " + host.encode() + b"\r\n\r\n")
            return tls.recv(1024)
```

## Good

```python
import socket
import ssl


def fetch(host: str) -> bytes:
    context = ssl.create_default_context()
    with socket.create_connection((host, 443)) as sock:
        with context.wrap_socket(sock, server_hostname=host) as tls:
            tls.sendall(b"GET / HTTP/1.1\r\nHost: " + host.encode() + b"\r\n\r\n")
            return tls.recv(1024)
```

## See Also

- [python-sec-subprocess-no-shell](sec-subprocess-no-shell.md) - another boundary where defaults must be chosen deliberately
