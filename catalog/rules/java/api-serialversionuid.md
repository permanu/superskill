---
id: java-api-serialversionuid
lang: java
prefix: api
title: "Declare an explicit serialVersionUID on every Serializable class"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [serializable, serialversionuid, compatibility, deserialization]
  files: ["**/*.java"]
  symbols: [Serializable, serialVersionUID]
related: [java-api-equals-hashcode]
sources:
  - title: "Serializable API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/io/Serializable.html
---
> Pin the serialization compatibility identifier; the computed default depends on compiler details.

## Why

The Serializable API warns that "the default serialVersionUID computation is highly sensitive to class details that may vary depending on compiler implementations, and can thus result in unexpected InvalidClassException's during deserialization", and "strongly recommends" that all serializable classes other than enums declare the field explicitly. Without it, two builds of the same source can produce incompatible classes and fail on data that was supposed to be readable.

## Bad

```java
import java.io.Serializable;

class Settings implements Serializable {
    private String environment;
}
```

## Good

```java
import java.io.Serializable;

class Settings implements Serializable {
    private static final long serialVersionUID = 1L;

    private String environment;
}
```

## See Also

- [java-api-equals-hashcode](api-equals-hashcode.md) - another long-lived compatibility contract on data types
