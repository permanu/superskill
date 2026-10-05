---
id: java-io-transfer-to
lang: java
prefix: io
title: "Copy streams with InputStream.transferTo instead of a manual loop"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [copy, stream, transfer, io]
  files: ["**/*.java"]
  symbols: [transferTo, InputStream, OutputStream]
related: [java-io-buffered-streams, java-io-no-available]
sources:
  - title: "InputStream API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/io/InputStream.html
---
> Replace hand-written read/write loops with transferTo, which documents its copy and close behavior.

## Why

InputStream.transferTo "reads all bytes from this input stream and writes the bytes to the given output stream in the order that they are read", returning with the input at end of stream, and it "does not close either stream". The manual loop it replaces is a repeated source of short-read bugs and buffer bookkeeping, and the single call makes the ownership rule visible: the caller still decides when both streams close.

## Bad

```java
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

class StreamCopier {

    void copy(InputStream in, OutputStream out) throws IOException {
        byte[] buffer = new byte[8192];
        int count;
        while ((count = in.read(buffer)) != -1) {
            out.write(buffer, 0, count);
        }
    }
}
```

## Good

```java
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

class StreamCopier {

    void copy(InputStream in, OutputStream out) throws IOException {
        in.transferTo(out);
    }
}
```

## See Also

- [java-io-buffered-streams](io-buffered-streams.md) - buffering the underlying streams
- [java-io-no-available](io-no-available.md) - the wrong way to size a read buffer
