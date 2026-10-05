---
id: java-style-imports-order
lang: java
prefix: style
title: "Group static imports first, then sort each group"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [imports, order, static, formatting]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-style-imports-no-wildcard]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Keep one static import block, then one non-static block, each in ASCII order.

## Why

Google style section 3.3.3 orders imports as "all static imports in a single group" followed by "all non-static imports in a single group", with "a single blank line" between them and names "in ASCII sort order" within each group. A fixed order makes an import's presence checkable at a glance and keeps diffs focused on real changes instead of reordered lines.

## Bad

```java
import java.util.List;
import static java.util.Comparator.naturalOrder;
import java.util.ArrayList;

class Names {
    List<String> sorted(List<String> names) {
        List<String> copy = new ArrayList<>(names);
        copy.sort(naturalOrder());
        return copy;
    }
}
```

## Good

```java
import static java.util.Comparator.naturalOrder;

import java.util.ArrayList;
import java.util.List;

class Names {
    List<String> sorted(List<String> names) {
        List<String> copy = new ArrayList<>(names);
        copy.sort(naturalOrder());
        return copy;
    }
}
```

## See Also

- [java-style-imports-no-wildcard](style-imports-no-wildcard.md) - what may appear in each group
