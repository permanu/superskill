---
id: java-conv-unsigned-parse
lang: java
prefix: conv
title: "Parse unsigned values with parseUnsignedInt"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unsigned, parse, integer, range]
  files: ["**/*.java"]
  symbols: [Integer.parseUnsignedInt]
related: [java-conv-radix-parse]
sources:
  - title: "Integer API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Integer.html
---
> Use the unsigned parser for values that use the full 32-bit range.

## Why

Integer.parseUnsignedInt "parses the string argument as an unsigned integer" where "an unsigned integer maps the values usually associated with negative numbers to positive numbers larger than MAX_VALUE". Values such as 4294967295 are valid unsigned 32-bit numbers but overflow the signed parser, so code that hand-rolls the conversion or rejects them outright misreads data that the API parses directly.

## Bad

```java
class Ids {
    int parse(String value) {
        return Integer.parseInt(value);
    }
}
```

## Good

```java
class Ids {
    int parse(String value) {
        return Integer.parseUnsignedInt(value);
    }
}
```

## See Also

- [java-conv-radix-parse](conv-radix-parse.md) - choosing the radix at the same call
