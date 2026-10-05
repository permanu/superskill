---
id: java-sec-sql-prepared
lang: java
prefix: sec
title: "Build SQL with PreparedStatement placeholders, never by concatenating input"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sql, injection, preparedstatement, jdbc]
  files: ["**/*.java"]
  symbols: [PreparedStatement, Statement]
related: [java-sec-xml-external-protocols]
sources:
  - title: "Java Tutorials: Using Prepared Statements"
    url: https://docs.oracle.com/javase/tutorial/jdbc/basics/prepared.html
---
> Bind every value as a parameter; string-built SQL lets input become code.

## Why

The JDBC tutorial states that "the most important advantage of prepared statements is that they help prevent SQL injection attacks", because "prepared statements always treat client-supplied data as content of a parameter and never as a part of an SQL statement". Concatenating input into the statement text makes the database parse attacker-controlled syntax as SQL, which is how injection gains unauthorized access.

## Bad

```java
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

class Users {
    String find(Connection connection, String name) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            try (ResultSet result = statement.executeQuery(
                    "select id from users where name = '" + name + "'")) {
                return result.next() ? result.getString(1) : null;
            }
        }
    }
}
```

## Good

```java
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

class Users {
    String find(Connection connection, String name) throws SQLException {
        try (PreparedStatement statement =
                     connection.prepareStatement("select id from users where name = ?")) {
            statement.setString(1, name);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getString(1) : null;
            }
        }
    }
}
```

## See Also

- [java-sec-xml-external-protocols](sec-xml-external-protocols.md) - the same principle for XML input
