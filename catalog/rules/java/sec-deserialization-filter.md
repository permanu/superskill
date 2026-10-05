---
id: java-sec-deserialization-filter
lang: java
prefix: sec
title: "Attach an ObjectInputFilter to every ObjectInputStream you do open"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [serialization, filter, objectinputfilter, allowlist]
  files: ["**/*.java"]
  symbols: [ObjectInputFilter, ObjectInputStream]
related: [java-sec-deserialization-untrusted]
sources:
  - title: "JEP 290: Filter Incoming Serialization Data"
    url: https://openjdk.org/jeps/290
---
> Allow only the classes a stream may contain; an unfiltered stream accepts the whole classpath.

## Why

JEP 290 records the requirement it implements: "Security guidelines consistently require that input from external sources be validated before use", and its filter "is called, with the class of the object, before the object is instantiated and deserialized". Without a filter, any class on the classpath is a legal payload for the stream; an allowlist reduces the gadget surface to the types the protocol actually uses and caps graph size while doing it.

## Bad

```java
import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputStream;

class Sessions {
    Object load(InputStream input) throws IOException, ClassNotFoundException {
        try (ObjectInputStream in = new ObjectInputStream(input)) {
            return in.readObject();
        }
    }
}
```

## Good

```java
import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputFilter;
import java.io.ObjectInputStream;

class Sessions {
    Object load(InputStream input) throws IOException, ClassNotFoundException {
        try (ObjectInputStream in = new ObjectInputStream(input)) {
            in.setObjectInputFilter(
                    ObjectInputFilter.Config.createFilter("com.example.Session;!*"));
            return in.readObject();
        }
    }
}
```

## See Also

- [java-sec-deserialization-untrusted](sec-deserialization-untrusted.md) - removing the need for this filter entirely
