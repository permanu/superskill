---
id: java-data-generated-keys
lang: java
prefix: data
title: "Read generated keys from the insert, not a follow-up query"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [jdbc, generated-keys, insert, identity]
  files: ["**/*.java"]
  symbols: [Statement.getGeneratedKeys]
related: [java-data-transaction]
sources:
  - title: "Statement API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java/sql/java/sql/Statement.html
---
> Ask for generated keys on the statement instead of guessing them afterwards.

## Why

Statement.getGeneratedKeys "retrieves any auto-generated keys created as a result of executing this Statement object", with RETURN_GENERATED_KEYS requested at execute time. A follow-up query (SELECT MAX(id), a re-read by unique columns) races with other writers and can return someone else's row; the generated keys belong to the statement that performed the insert.

## Bad

```java
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

class Insert {
    void insert(Connection connection, String name) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("INSERT INTO items(name) VALUES ('" + name + "')");
        }
    }
}
```

## Good

```java
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

class Insert {
    long insert(Connection connection, String name) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("INSERT INTO items(name) VALUES ('" + name + "')",
                    Statement.RETURN_GENERATED_KEYS);
            try (ResultSet keys = statement.getGeneratedKeys()) {
                keys.next();
                return keys.getLong(1);
            }
        }
    }
}
```

## See Also

- [java-data-transaction](data-transaction.md) - committing the insert that produced the key
