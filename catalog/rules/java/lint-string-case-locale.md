---
id: java-lint-string-case-locale
lang: java
prefix: lint
title: "Pass a Locale when changing case"
severity: should
enforce: tool
tool: "errorprone:StringCaseLocaleUsage"
baseline: latest
status: verified
triggers:
  keywords: [locale, case, string, identifier]
  files: ["**/*.java"]
  symbols: [StringCaseLocaleUsage]
related: [java-io-charset-explicit]
sources:
  - title: "Error Prone: StringCaseLocaleUsage"
    url: https://errorprone.info/bugpattern/StringCaseLocaleUsage
---
> Case conversion depends on the default locale; pass Locale.ROOT for machine-readable text.

## Why

Error Prone's StringCaseLocaleUsage check warns that String.toLowerCase and toUpperCase "without specifying a Locale can have surprising results": under the Turkish locale, `"I".toLowerCase()` "will yield a lowercase dotless I", which is "extremely dangerous if you were expecting to operate on ASCII text to generate machine-readable identifiers". Locale.ROOT (or Locale.ENGLISH) gives casing independent of the user's locale.

## Bad

```java
class Tags {
    String normalize(String tag) {
        return tag.toUpperCase();
    }
}
```

## Good

```java
import java.util.Locale;

class Tags {
    String normalize(String tag) {
        return tag.toUpperCase(Locale.ROOT);
    }
}
```

## See Also

- [java-io-charset-explicit](io-charset-explicit.md) - the charset analogue of depending on an ambient default
