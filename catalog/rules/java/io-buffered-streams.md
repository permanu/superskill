---
id: java-io-buffered-streams
lang: java
prefix: io
title: "Wrap byte streams in buffered streams before per-byte I/O"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [stream, buffer, throughput, io]
  files: ["**/*.java"]
  symbols: [BufferedOutputStream, BufferedInputStream]
related: [java-io-transfer-to]
sources:
  - title: "BufferedOutputStream API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/io/BufferedOutputStream.html
---
> Buffer small writes and reads so each byte does not become a system call.

## Why

The BufferedOutputStream documentation explains that with a buffered stream "an application can write bytes to the underlying output stream without necessarily causing a call to the underlying system for each byte written". An unbuffered stream turns every single-byte write into a system call, and call overhead dwarfs the payload. Wrap the stream once at construction; the buffer batches the writes and flushes on close.

## Bad

```java
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

class ByteWriter {

    void write(Path path, byte[] data) throws IOException {
        try (OutputStream out = Files.newOutputStream(path)) {
            for (byte value : data) {
                out.write(value);
            }
        }
    }
}
```

## Good

```java
import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

class ByteWriter {

    void write(Path path, byte[] data) throws IOException {
        try (OutputStream out = new BufferedOutputStream(Files.newOutputStream(path))) {
            for (byte value : data) {
                out.write(value);
            }
        }
    }
}
```

## See Also

- [java-io-transfer-to](io-transfer-to.md) - copying whole streams instead of looping over bytes
