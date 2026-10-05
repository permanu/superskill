---
id: java-io-no-available
lang: java
prefix: io
title: "Never size a buffer with InputStream.available()"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [inputstream, buffer, available, read]
  files: ["**/*.java"]
  symbols: [InputStream, readAllBytes]
related: [java-io-transfer-to]
sources:
  - title: "InputStream API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/io/InputStream.html
---
> Read to end of stream instead of trusting available(), which is only an estimate.

## Why

The InputStream documentation is explicit: "it is never correct to use the return value of this method to allocate a buffer intended to hold all data in this stream". available() reports bytes readable without blocking, and implementations may return 0 or a partial count even when more data follows, so a buffer sized from it truncates the payload or fails entirely. Use readAllBytes for in-memory reads or a read loop with a fixed buffer.

## Bad

```java
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

class BodyReader {

    String read(InputStream in) throws IOException {
        byte[] body = new byte[in.available()];
        int count = in.read(body);
        return new String(body, 0, Math.max(count, 0), StandardCharsets.UTF_8);
    }
}
```

## Good

```java
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

class BodyReader {

    String read(InputStream in) throws IOException {
        return new String(in.readAllBytes(), StandardCharsets.UTF_8);
    }
}
```

## See Also

- [java-io-transfer-to](io-transfer-to.md) - the streaming alternative for large payloads
