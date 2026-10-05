---
id: java-sec-constant-time-equal
lang: java
prefix: sec
title: "Compare digests and tokens with MessageDigest.isEqual, not Arrays.equals"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [timing, digest, compare, constant-time]
  files: ["**/*.java"]
  symbols: [MessageDigest.isEqual, Arrays.equals]
related: [java-sec-securerandom]
sources:
  - title: "MessageDigest API: isEqual"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/security/MessageDigest.html#isEqual(byte%5B%5D,byte%5B%5D)
---
> Verify secrets with the digest comparison whose timing does not depend on contents.

## Why

The MessageDigest.isEqual implementation note states that "all bytes in digesta are examined to determine equality" and that "the calculation time depends only on the length of digesta. It does not depend on the length of digestb or the contents of digesta and digestb." Arrays.equals returns at the first mismatch, so the time to reject a guess reveals how many leading bytes were correct, which is enough to reconstruct a token byte by byte.

## Bad

```java
import java.util.Arrays;

class Tokens {
    boolean matches(byte[] expected, byte[] actual) {
        return Arrays.equals(expected, actual);
    }
}
```

## Good

```java
import java.security.MessageDigest;

class Tokens {
    boolean matches(byte[] expected, byte[] actual) {
        return MessageDigest.isEqual(expected, actual);
    }
}
```

## See Also

- [java-sec-securerandom](sec-securerandom.md) - generating the values being compared
