---
id: java-net-http-body-handlers
lang: java
prefix: net
title: "Choose a BodyHandler instead of reading the stream by hand"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [httpclient, bodyhandler, response, body]
  files: ["**/*.java"]
  symbols: [HttpResponse.BodyHandlers]
related: [java-net-httpclient-async]
sources:
  - title: "HttpClient API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.net.http/java/net/http/HttpClient.html
---
> Name the body handling in the send call; the client owns the stream lifecycle.

## Why

The HttpClient documentation's examples pass a body handler at send time — `client.sendAsync(request, BodyHandlers.ofString()).thenApply(HttpResponse::body)` — so the client reads and closes the response body and hands back the converted value. Reading the raw stream outside the handler moves the framing, decoding, and closing responsibilities into application code, where a missed close leaks connections.

## Bad

```java
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

class Fetch {
    String body(HttpClient client, String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url)).build();
        HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
        try (InputStream stream = response.body()) {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
```

## Good

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

class Fetch {
    String body(HttpClient client, String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url)).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString()).body();
    }
}
```

## See Also

- [java-net-httpclient-async](net-httpclient-async.md) - the asynchronous form of the same call
