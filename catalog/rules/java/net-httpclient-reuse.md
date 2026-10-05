---
id: java-net-httpclient-reuse
lang: java
prefix: net
title: "Reuse one HttpClient instead of creating one per call"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [httpclient, reuse, connection-pool, http]
  files: ["**/*.java"]
  symbols: [HttpClient]
related: [java-net-httpclient-async]
sources:
  - title: "HttpClient API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.net.http/java/net/http/HttpClient.html
---
> Build one client and share it; each client owns its own connection pool.

## Why

The HttpClient documentation states that "once built, an HttpClient is immutable, and can be used to send multiple requests. An HttpClient provides configuration information, and resource sharing, for all requests sent through it", and that "connection pools are typically not shared between HttpClient instances". A client created per request therefore opens a fresh pool every time, discarding keep-alive connections and paying TLS setup repeatedly.

## Bad

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

class Ping {
    String get(String url) throws Exception {
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

class Ping {
    private static final HttpClient CLIENT = HttpClient.newHttpClient();

    String get(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url)).build();
        return CLIENT.send(request, HttpResponse.BodyHandlers.ofString()).body();
    }
}
```

## See Also

- [java-net-httpclient-async](net-httpclient-async.md) - overlapping requests through the shared client
