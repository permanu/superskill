---
id: java-style-camel-case
lang: java
prefix: style
title: "Convert acronyms when naming types and members"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, camelcase, acronym]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-style-constant-names]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Lowercase acronyms inside camel-case names: XmlHttpRequest, getCustomerId.

## Why

Google style section 5.3 lowercases "everything (including acronyms), then uppercase only the first character of ... each word" — its table maps "XML HTTP request" to XmlHttpRequest and "new customer ID" to newCustomerId. Keeping acronyms in caps produces names like XMLHTTPRequest and getCustomerID, which read as word boundaries in the wrong places and defeat the predictable word splitting the convention exists for.

## Bad

```java
class XMLHTTPRequest {
    private int id;

    int getCustomerID() {
        return id;
    }
}
```

## Good

```java
class XmlHttpRequest {
    private int id;

    int getCustomerId() {
        return id;
    }
}
```

## See Also

- [java-style-constant-names](style-constant-names.md) - the exception for constants
