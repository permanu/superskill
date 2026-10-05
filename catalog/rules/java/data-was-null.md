---
id: java-data-was-null
lang: java
prefix: data
title: "Distinguish SQL NULL from zero with wasNull"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [jdbc, "null", resultset, wasnull]
  files: ["**/*.java"]
  symbols: [ResultSet.wasNull]
related: [java-data-fetch-size]
sources:
  - title: "ResultSet API"
    url: https://docs.oracle.com/javase/23/docs/api/java.sql/java/sql/ResultSet.html
---
> Check wasNull after reading a column that may be SQL NULL.

## Why

ResultSet.wasNull "reports whether the last column read had a value of SQL NULL". The primitive getters return zero (or false) for a NULL column, so a missing value is indistinguishable from a real 0 unless wasNull is consulted; that confusion turns "no data" into a legitimate-looking measurement.

## Bad

```java
import java.sql.ResultSet;
import java.sql.SQLException;

class Scores {
    int score(ResultSet row) throws SQLException {
        return row.getInt("score");
    }
}
```

## Good

```java
import java.sql.ResultSet;
import java.sql.SQLException;

class Scores {
    Integer score(ResultSet row) throws SQLException {
        int value = row.getInt("score");
        return row.wasNull() ? null : value;
    }
}
```

## See Also

- [java-data-fetch-size](data-fetch-size.md) - reading large result sets efficiently
