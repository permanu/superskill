---
id: java-perf-stringbuilder-over-stringbuffer
lang: java
prefix: perf
title: "Use StringBuilder instead of StringBuffer for single-threaded building"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [string, builder, buffer, concat]
  files: ["**/*.java"]
  symbols: [StringBuilder, StringBuffer]
sources:
  - title: "StringBuilder API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/StringBuilder.html
---
> Use StringBuilder as the default mutable string type; reserve StringBuffer for buffers shared across threads.

## Why

The StringBuilder documentation recommends it over its predecessor: "where possible, it is recommended that this class be used in preference to StringBuffer as it will be faster under most implementations". StringBuffer synchronizes every append and insert, paying for thread safety that a builder confined to one method or thread never needs. StringBuilder is the drop-in replacement in exactly those single-threaded cases.

## Bad

```java
class QueryBuilder {

    private final StringBuffer sql = new StringBuffer();

    QueryBuilder add(String fragment) {
        sql.append(fragment).append(' ');
        return this;
    }

    String build() {
        return sql.toString().trim();
    }
}
```

## Good

```java
class QueryBuilder {

    private final StringBuilder sql = new StringBuilder();

    QueryBuilder add(String fragment) {
        sql.append(fragment).append(' ');
        return this;
    }

    String build() {
        return sql.toString().trim();
    }
}
```
