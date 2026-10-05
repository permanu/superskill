---
id: java-api-check-return-value
lang: java
prefix: api
title: "Use the value a non-void method returns; ignoring it is often a no-op"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [return, ignored, no-op, immutable]
  files: ["**/*.java"]
  symbols: [String.strip, String.concat]
related: [java-api-immutable-exposure]
sources:
  - title: "Error Prone: CheckReturnValue"
    url: https://errorprone.info/bugpattern/CheckReturnValue
---
> Assign or consume the result of a pure method; the receiver is not mutated.

## Why

Error Prone's CheckReturnValue check opens with the rule: "When code calls a non-void method, it should usually use the value that the method returns." Its canonical example is a no-op: string.concat("\n") "doesn't modify string; it returns a new string for the caller to use". Immutable types such as String and the java.time classes follow this pattern, so discarding the result silently drops the computation.

## Bad

```java
class Input {
    void normalize(String raw) {
        raw.strip();
        System.out.println("stored " + raw);
    }
}
```

## Good

```java
class Input {
    void normalize(String raw) {
        String value = raw.strip();
        System.out.println("stored " + value);
    }
}
```

## See Also

- [java-api-immutable-exposure](api-immutable-exposure.md) - immutability as the API contract behind this behavior
