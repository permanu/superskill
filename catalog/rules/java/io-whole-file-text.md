---
id: java-io-whole-file-text
lang: java
prefix: io
title: "Read and write whole text files with Files.readString and writeString"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [file, read, write, text]
  files: ["**/*.java"]
  symbols: [Files.readString, Files.writeString]
related: [java-io-lines-stream, java-io-charset-explicit]
sources:
  - title: "Files API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/nio/file/Files.html
---
> Use the string convenience methods for whole-file text; keep byte arrays out of the common path.

## Why

Files.readString and Files.writeString handle whole-file text in one call, decoding and encoding with UTF-8 without a manual charset step. The byte-oriented alternatives force callers to pair getBytes and a constructor correctly and obscure the encoding decision. Its API note marks readString as "intended for simple cases where it is appropriate and convenient to read the content of a file into a String. It is not intended for reading very large files", so switch to a streaming reader when the file can be large.

## Bad

```java
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

class NoteStore {

    void save(Path path, String note) throws IOException {
        Files.write(path, note.getBytes(StandardCharsets.UTF_8));
    }

    String load(Path path) throws IOException {
        return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
    }
}
```

## Good

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

class NoteStore {

    void save(Path path, String note) throws IOException {
        Files.writeString(path, note);
    }

    String load(Path path) throws IOException {
        return Files.readString(path);
    }
}
```

## See Also

- [java-io-lines-stream](io-lines-stream.md) - the streaming form for large files
- [java-io-charset-explicit](io-charset-explicit.md) - why UTF-8 is the right default
