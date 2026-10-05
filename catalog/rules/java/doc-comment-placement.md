---
id: java-doc-comment-placement
lang: java
prefix: doc
title: "Place the doc comment immediately before the declaration"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [javadoc, placement, annotations, documentation]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-doc-override-omit]
sources:
  - title: "JavaDoc Documentation Comment Specification"
    url: https://docs.oracle.com/en/java/javase/26/docs/specs/javadoc/doc-comment-spec.html
---
> Put the doc comment before the annotations and modifiers; a comment after them is not a doc comment.

## Why

The Javadoc specification says documentation comments "are recognized only when placed immediately before the declaration of a module, package, class, interface, constructor, method, annotation interface element, enum member, or field", and that "a documentation comment should appear before any annotation, modifier, keyword, identifier, or other Java construct that is part of the declaration". A comment placed after @Override is an ordinary comment, so the intended text never reaches the generated documentation.

## Bad

```java
class Service {
    @Override
    /**
     * Returns the service name.
     */
    public String toString() {
        return "service";
    }
}
```

## Good

```java
class Service {
    /**
     * Returns the service name.
     */
    @Override
    public String toString() {
        return "service";
    }
}
```

## See Also

- [java-doc-override-omit](doc-override-omit.md) - whether the override needs a comment at all
