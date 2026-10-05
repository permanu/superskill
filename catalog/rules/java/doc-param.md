---
id: java-doc-param
lang: java
prefix: doc
title: "Give every parameter its own @param tag"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [javadoc, param, parameters, documentation]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-doc-return, java-doc-throws, java-doc-tags-order]
sources:
  - title: "JavaDoc Documentation Comment Specification"
    url: https://docs.oracle.com/en/java/javase/26/docs/specs/javadoc/doc-comment-spec.html
---
> Document each parameter and type parameter with @param; missing tags make the method contract incomplete.

## Why

The Javadoc specification's method documentation list requires "a param tag per method type parameter, if any" and "a param tag per formal parameter, if any", and a missing item in an overriding method is only "considered as if it were provided with {@inheritDoc}" when the supertype documents it. @param is valid for methods, constructors, and classes, and a type parameter is written as `@param <T>`. Undocumented parameters force callers to read the implementation to learn what the arguments mean.

## Bad

```java
class Text {
    /**
     * Wraps the text to the given width.
     */
    static String wrap(String text, int width) {
        return text;
    }
}
```

## Good

```java
class Text {
    /**
     * Wraps the text to the given width.
     *
     * @param text the text to wrap
     * @param width the maximum line width
     * @return the wrapped text
     */
    static String wrap(String text, int width) {
        return text;
    }
}
```

## See Also

- [java-doc-return](doc-return.md) - documenting the result
- [java-doc-throws](doc-throws.md) - documenting declared exceptions
- [java-doc-tags-order](doc-tags-order.md) - the order these tags appear in
