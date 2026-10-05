---
id: java-conv-radix-parse
lang: java
prefix: conv
title: "Pass the radix to parseInt for non-decimal input"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [parse, radix, hex, integer]
  files: ["**/*.java"]
  symbols: [Integer.parseInt]
related: [java-conv-unsigned-parse]
sources:
  - title: "Integer API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Integer.html
---
> Tell parseInt the base; decimal is only the default.

## Why

Integer.parseInt(String, int) "parses the string argument as a signed integer in the radix specified by the second argument", while the single-argument form parses decimal only. Feeding hexadecimal or binary digits to the decimal form throws NumberFormatException at run time; naming the radix makes the intended base explicit and the failure impossible.

## Bad

```java
class Hex {
    int parse(String digits) {
        return Integer.parseInt(digits);
    }
}
```

## Good

```java
class Hex {
    int parse(String digits) {
        return Integer.parseInt(digits, 16);
    }
}
```

## See Also

- [java-conv-unsigned-parse](conv-unsigned-parse.md) - parsing values above the signed range
