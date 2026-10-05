---
id: java-sec-deserialization-untrusted
lang: java
prefix: sec
title: "Keep ObjectInputStream off untrusted input paths"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deserialization, objectinputstream, untrusted, serializable]
  files: ["**/*.java"]
  symbols: [ObjectInputStream, Serializable]
related: [java-sec-deserialization-filter, java-err-checked-vs-unchecked]
sources:
  - title: "Serializable API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/io/Serializable.html
---
> Parse untrusted bytes into typed data with an explicit protocol; never let them choose classes.

## Why

The Serializable API opens with a warning: "Deserialization of untrusted data is inherently dangerous and should be avoided." A serialization stream controls which classes are instantiated and which readObject hooks execute during reconstruction, so accepting such a stream from a request is equivalent to letting the sender run code from the classpath. A fixed binary protocol over the same bytes keeps the sender limited to values.

## Bad

```java
import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputStream;

class SessionStore {
    Object load(InputStream input) throws IOException, ClassNotFoundException {
        try (ObjectInputStream in = new ObjectInputStream(input)) {
            return in.readObject();
        }
    }
}
```

## Good

```java
import java.io.DataInputStream;
import java.io.IOException;
import java.io.InputStream;

class SessionStore {
    UserSession load(InputStream input) throws IOException {
        try (DataInputStream data = new DataInputStream(input)) {
            return new UserSession(data.readUTF(), data.readLong());
        }
    }
}

record UserSession(String userId, long expiresAtEpochSecond) {
}
```

## See Also

- [java-sec-deserialization-filter](sec-deserialization-filter.md) - the fallback when a stream is unavoidable
- [java-err-checked-vs-unchecked](err-checked-vs-unchecked.md) - typing the failures of an explicit format
