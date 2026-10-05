---
id: java-sec-xxe-doctype
lang: java
prefix: sec
title: "Disable DTDs and external entities on XML parsers that read untrusted documents"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [xml, xxe, doctype, entities]
  files: ["**/*.java"]
  symbols: [DocumentBuilderFactory, XMLConstants]
related: [java-sec-xml-external-protocols]
sources:
  - title: "JEP 185: Restrict Fetching of External XML Resources"
    url: https://openjdk.org/jeps/185
---
> Turn off doctype declarations and external entity resolution; a document must not fetch anything.

## Why

JEP 185 describes features that "instruct the processor not to load external DTDs or resolve external entities": disallow-doctype-decl true, load-external-dtd false, external-general-entities false, and external-parameter-entities false. A parser that resolves entities turns a document into a file or network fetch chosen by the sender, which is how XXE reads local files and probes internal services.

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
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

class Xml {
    DocumentBuilderFactory factory() throws ParserConfigurationException {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        return factory;
    }
}
```

## See Also

- [java-sec-xml-external-protocols](sec-xml-external-protocols.md) - the protocol allowlist for documents that need schemas
