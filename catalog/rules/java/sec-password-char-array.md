---
id: java-sec-password-char-array
lang: java
prefix: sec
title: "Hold passwords in char[] and clear them, not in String"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [password, char-array, clear, memory]
  files: ["**/*.java"]
  symbols: [PBEKeySpec, "char[]"]
related: [java-sec-securerandom]
sources:
  - title: "PBEKeySpec API"
    url: https://docs.oracle.com/en/java/javase/26/docs/api/java.base/javax/crypto/spec/PBEKeySpec.html
---
> Keep credentials in a mutable buffer you can wipe; String keeps them until GC.

## Why

PBEKeySpec stores passwords "as char arrays instead of String objects... because the String class is immutable and there is no way to overwrite its internal value when the password stored in it is no longer needed", and its getPassword note makes zeroing "the caller's responsibility". A password held in a String stays in the heap until garbage collection, where it can surface in heap dumps and crash logs long after the login finished.

## Bad

```java
class Credentials {
    private final String password;

    Credentials(String password) {
        this.password = password;
    }

    String password() {
        return password;
    }
}
```

## Good

```java
import java.util.Arrays;

class Credentials {
    private final char[] password;

    Credentials(char[] password) {
        this.password = password.clone();
    }

    void clear() {
        Arrays.fill(password, '\0');
    }
}
```

## See Also

- [java-sec-securerandom](sec-securerandom.md) - the generator for values that must not be guessable
