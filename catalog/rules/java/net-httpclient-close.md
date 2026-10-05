---
id: java-net-httpclient-close
lang: java
prefix: net
title: "Close an HttpClient you own"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [httpclient, close, autocloseable, resources]
  files: ["**/*.java"]
  symbols: [HttpClient]
related: [java-net-httpclient-reuse]
sources:
  - title: "HttpClient API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.net.http/java/net/http/HttpClient.html
---
> An owned client is AutoCloseable; close it when its work is done.

## Why

HttpClient implements AutoCloseable, and its close method "initiates an orderly shutdown in which requests previously submitted to send or sendAsync are run to completion, but no new request will be accepted". A client holds a connection pool and supporting threads; an application that creates a client for a bounded unit of work and never closes it leaves those resources alive for the life of the process. Wrapping the owned client in try-with-resources ties its lifetime to the work it serves.

## Bad

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

class Job {
    String run(String url) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder(URI.create(url)).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString()).body();
    }
}
```

## Good

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

class Job {
    String run(String url) throws Exception {
        try (HttpClient client = HttpClient.newHttpClient()) {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url)).build();
            return client.send(request, HttpResponse.BodyHandlers.ofString()).body();
        }
    }
}
```

## See Also

- [java-net-httpclient-reuse](net-httpclient-reuse.md) - when one long-lived client serves the whole application
