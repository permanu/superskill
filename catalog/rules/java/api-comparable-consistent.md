---
id: java-api-comparable-consistent
lang: java
prefix: api
title: "Keep compareTo consistent with equals or document the inconsistency"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [comparable, compareto, equals, ordering]
  files: ["**/*.java"]
  symbols: [Comparable, compareTo]
related: [java-api-equals-hashcode]
sources:
  - title: "Comparable API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Comparable.html
---
> Make compareTo return zero exactly when equals is true, or state the mismatch in the Javadoc.

## Why

The Comparable API states that "it is strongly recommended (though not required) that natural orderings be consistent with equals", because a sorted set or map "without explicit comparators" then "violates the general contract for set (or map)": adding two keys where compareTo is zero but equals is false makes the second add fail as if it were a duplicate. When consistency is impossible, the API note prescribes the wording: "Note: this class has a natural ordering that is inconsistent with equals."

## Bad

```java
class Version implements Comparable<Version> {
    private final int major;
    private final int minor;

    Version(int major, int minor) {
        this.major = major;
        this.minor = minor;
    }

    @Override
    public int compareTo(Version other) {
        return Integer.compare(major, other.major);
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof Version version && major == version.major && minor == version.minor;
    }

    @Override
    public int hashCode() {
        return 31 * major + minor;
    }
}
```

## Good

```java
class Version implements Comparable<Version> {
    private final int major;
    private final int minor;

    Version(int major, int minor) {
        this.major = major;
        this.minor = minor;
    }

    @Override
    public int compareTo(Version other) {
        int byMajor = Integer.compare(major, other.major);
        return byMajor != 0 ? byMajor : Integer.compare(minor, other.minor);
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof Version version && major == version.major && minor == version.minor;
    }

    @Override
    public int hashCode() {
        return 31 * major + minor;
    }
}
```

## See Also

- [java-api-equals-hashcode](api-equals-hashcode.md) - the equality contract compareTo must mirror
