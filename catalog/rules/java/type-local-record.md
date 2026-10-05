---
id: java-type-local-record
lang: java
prefix: type
title: "Use a local record for an intermediate aggregate instead of tuple arrays"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [record, local, tuple, intermediate, aggregate]
  files: ["**/*.java"]
  symbols: [Record]
related: [java-type-record-data-carrier, java-type-record-pattern]
sources:
  - title: "JEP 395: Records"
    url: https://openjdk.org/jeps/395
---
> Group method-local intermediate values in a local record with named components.

## Why

JEP 395 observes that a program dealing with records "is likely to deal with many intermediate values that are themselves simple groups of variables", and defines local records for exactly this: "declare a record inside a method, close to the code which manipulates the variables". An Object[] or a pair of parallel variables has no component names and no types, so every read site has to remember the layout; a local record makes the aggregate self-describing without leaving the method.

## Bad

```java
import java.util.ArrayList;
import java.util.List;

class Report {
    List<String> labels(List<String> names, List<Integer> scores) {
        var labels = new ArrayList<String>();
        for (int i = 0; i < names.size(); i++) {
            Object[] pair = {names.get(i), scores.get(i)};
            labels.add(pair[0] + ": " + pair[1]);
        }
        return labels;
    }
}
```

## Good

```java
import java.util.ArrayList;
import java.util.List;

class Report {
    List<String> labels(List<String> names, List<Integer> scores) {
        record Entry(String name, int score) {
        }
        var entries = new ArrayList<Entry>();
        for (int i = 0; i < names.size(); i++) {
            entries.add(new Entry(names.get(i), scores.get(i)));
        }
        var labels = new ArrayList<String>();
        for (Entry entry : entries) {
            labels.add(entry.name() + ": " + entry.score());
        }
        return labels;
    }
}
```

## See Also

- [java-type-record-data-carrier](type-record-data-carrier.md) - the same record semantics at type level
- [java-type-record-pattern](type-record-pattern.md) - deconstructing these aggregates at the use site
