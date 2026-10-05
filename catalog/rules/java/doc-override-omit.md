---
id: java-doc-override-omit
lang: java
prefix: doc
title: "Do not repeat inherited documentation on overriding methods"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [javadoc, override, inheritance, documentation]
  files: ["**/*.java"]
  symbols: [Override, inheritDoc]
related: [java-doc-public-coverage]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
  - title: "JavaDoc Documentation Comment Specification"
    url: https://docs.oracle.com/en/java/javase/26/docs/specs/javadoc/doc-comment-spec.html
---
> Leave overrides undocumented when the inherited contract suffices; duplicated text drifts apart.

## Why

Google style section 7.3.2 states that "Javadoc is not always present on a method that overrides a supertype method", and the Javadoc specification defines inheritance by omission: missing items in an overriding method's comment "are assumed to be inherited" from the overridden method. Copying the supertype's text into every override creates two sources of truth that drift as soon as the contract changes.

## Bad

```java
interface Store {
    /** Returns the value for the key. */
    String get(String key);
}

class CachingStore implements Store {
    /**
     * Returns the value for the key.
     */
    @Override
    public String get(String key) {
        return key;
    }
}
```

## Good

```java
interface Store {
    /** Returns the value for the key. */
    String get(String key);
}

class CachingStore implements Store {
    @Override
    public String get(String key) {
        return key;
    }
}
```

## See Also

- [java-doc-public-coverage](doc-public-coverage.md) - the coverage rule this exception belongs to
