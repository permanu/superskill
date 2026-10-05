---
id: java-conv-list-to-array
lang: java
prefix: conv
title: "Convert collections to arrays with the generator form of toArray"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [toarray, collection, array, conversion]
  files: ["**/*.java"]
  symbols: [Collection.toArray]
related: [java-conv-radix-parse]
sources:
  - title: "Collection API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Collection.html
---
> Use toArray(String[]::new); it allocates the right array in one step.

## Why

Collection.toArray(IntFunction) "returns an array containing all of the elements in this collection, using the provided generator function to allocate the returned array", and the documentation's example shows `String[] y = x.toArray(String[]::new)`. Copying element by element duplicates what the collection already knows and gets the size or ordering wrong whenever the collection changes between the size call and the loop.

## Bad

```java
import java.util.List;

class Names {
    String[] asArray(List<String> names) {
        String[] array = new String[names.size()];
        for (int i = 0; i < names.size(); i++) {
            array[i] = names.get(i);
        }
        return array;
    }
}
```

## Good

```java
import java.util.List;

class Names {
    String[] asArray(List<String> names) {
        return names.toArray(String[]::new);
    }
}
```

## See Also

- [java-conv-radix-parse](conv-radix-parse.md) - another conversion with a dedicated API
