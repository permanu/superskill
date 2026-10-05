---
id: java-api-deprecate-with-replacement
lang: java
prefix: api
title: "Deprecate with @Deprecated and name the replacement in the Javadoc"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deprecated, replacement, javadoc, migration]
  files: ["**/*.java"]
  symbols: [Deprecated]
related: [java-api-override-annotation]
sources:
  - title: "JavaDoc Documentation Comment Specification: @deprecated"
    url: https://docs.oracle.com/en/java/javase/26/docs/specs/javadoc/doc-comment-spec.html
---
> Mark obsolete API with @Deprecated and tell callers what to use instead.

## Why

The Javadoc specification for the deprecated tag says its "first sentence should tell the user when the API was deprecated and what to use as a replacement", and for Markdown comments the @Deprecated annotation must be present to mark the declaration. A bare annotation tells callers only that something is wrong; without a named replacement they cannot migrate, so the deprecated member survives indefinitely.

## Bad

```java
class Api {
    @Deprecated
    String oldName() {
        return newName();
    }

    String newName() {
        return "new";
    }
}
```

## Good

```java
class Api {
    /**
     * @deprecated use {@link #newName()} instead
     */
    @Deprecated
    String oldName() {
        return newName();
    }

    String newName() {
        return "new";
    }
}
```

## See Also

- [java-api-override-annotation](api-override-annotation.md) - the other declaration annotation every API honors
