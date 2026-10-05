---
id: java-anti-default-charset
lang: java
prefix: anti
title: "Do not convert bytes to text with the default charset"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [charset, bytes, encoding, default]
  files: ["**/*.java"]
  symbols: [StandardCharsets]
related: [java-io-charset-explicit]
sources:
  - title: "Error Prone: DefaultCharset"
    url: https://errorprone.info/bugpattern/DefaultCharset
---
> Name the charset in every byte-to-text conversion.

## Why

Error Prone's DefaultCharset check explains that "using APIs that rely on the JVM's default Charset under the hood is dangerous. The default charset can vary from machine to machine or JVM to JVM. This can lead to unstable character encoding/decoding between runs of your program". The String constructors and getBytes without a charset are the most common instances, and they look identical to the safe form.

## Bad

```java
class Body {
    String text(byte[] bytes) {
        return new String(bytes);
    }
}
```

## Good

```java
import java.nio.charset.StandardCharsets;

class Body {
    String text(byte[] bytes) {
        return new String(bytes, StandardCharsets.UTF_8);
    }
}
```

## See Also

- [java-io-charset-explicit](io-charset-explicit.md) - the file-boundary version of the same rule
