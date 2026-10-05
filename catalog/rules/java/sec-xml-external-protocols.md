---
id: java-sec-xml-external-protocols
lang: java
prefix: sec
title: "Restrict external DTD and schema access to the protocols you need"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [xml, external, protocols, schema]
  files: ["**/*.java"]
  symbols: [XMLConstants, DocumentBuilderFactory]
related: [java-sec-xxe-doctype]
sources:
  - title: "JEP 185: Restrict Fetching of External XML Resources"
    url: https://openjdk.org/jeps/185
---
> Set ACCESS_EXTERNAL_* to the minimum protocol list; an empty string allows no access.

## Why

JEP 185 adds ACCESS_EXTERNAL_DTD and ACCESS_EXTERNAL_SCHEMA "to limit external connections to specific, named protocols", where "an empty string allows no access" and the keyword all grants everything. A factory left at its defaults resolves external DTDs and schemas from file and network schemes the document was never meant to touch; setting both attributes to the empty string blocks those fetches.

## Bad

```java
import javax.xml.parsers.DocumentBuilderFactory;

class Xml {
    DocumentBuilderFactory factory() {
        return DocumentBuilderFactory.newInstance();
    }
}
```

## Good

```java
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;

class Xml {
    DocumentBuilderFactory factory() {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        return factory;
    }
}
```

## See Also

- [java-sec-xxe-doctype](sec-xxe-doctype.md) - the stronger setting when no DTD is needed at all
