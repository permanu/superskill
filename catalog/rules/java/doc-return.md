---
id: java-doc-return
lang: java
prefix: doc
title: "Document every non-void result with @return or {@return}"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [javadoc, return, documentation]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-doc-param, java-doc-summary-fragment]
sources:
  - title: "JavaDoc Documentation Comment Specification"
    url: https://docs.oracle.com/en/java/javase/26/docs/specs/javadoc/doc-comment-spec.html
---
> State what a non-void method returns; use the inline {@return} form when the summary should be the return description.

## Why

The Javadoc specification requires "a return tag for the result, if the return type is not void". Since JDK 16 the tag also has an inline form that "provides content for the first sentence of a method's main description, and a 'Returns' section" as if the block tag were present, so a single `{@return ...}` documents the result and opens the comment. Callers read the Returns section to learn what a value means, especially for collections and optionals.

## Bad

```java
class Text {
    /**
     * Returns the length of the text.
     */
    static int length(String text) {
        return text.length();
    }
}
```

## Good

```java
class Text {
    /**
     * {@return the length of the text}
     */
    static int length(String text) {
        return text.length();
    }
}
```

## See Also

- [java-doc-param](doc-param.md) - documenting the inputs
- [java-doc-summary-fragment](doc-summary-fragment.md) - the summary the inline form replaces
