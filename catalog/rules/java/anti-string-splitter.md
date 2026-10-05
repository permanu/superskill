---
id: java-anti-string-splitter
lang: java
prefix: anti
title: "Do not rely on split's default trailing-empty behavior"
severity: prefer
enforce: tool
tool: "errorprone:StringSplitter"
baseline: latest
status: verified
triggers:
  keywords: [split, string, parsing, limit]
  files: ["**/*.java"]
  symbols: [String.split]
related: [java-conv-radix-parse]
sources:
  - title: "Error Prone: StringSplitter"
    url: https://errorprone.info/bugpattern/StringSplitter
---
> split() drops trailing empty strings; pass a negative limit to keep them.

## Why

Error Prone's StringSplitter check calls out that "String.split(String) and Pattern.split(CharSequence) have surprising behaviour", showing that `""` split on ":" yields `[""]` while `":"` split on ":" yields `[]` — trailing empty fields vanish. Code that counts fields, parses CSV, or validates record shapes gets a different array length depending on the data unless the limit is explicit.

## Bad

```java
class Csv {
    String[] fields(String line) {
        return line.split(",");
    }
}
```

## Good

```java
class Csv {
    String[] fields(String line) {
        return line.split(",", -1);
    }
}
```

## See Also

- [java-conv-radix-parse](conv-radix-parse.md) - another parsing call with a default that must be made explicit
