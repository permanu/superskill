---
id: java-sec-tls-verify
lang: java
prefix: sec
title: "Never install a trust-all TrustManager or disable hostname verification"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tls, trustmanager, certificate, hostname]
  files: ["**/*.java"]
  symbols: [SSLContext, X509TrustManager]
related: [java-sec-tls-version]
sources:
  - title: "java.net.http module summary"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.net.http/module-summary.html
---
> Keep the default certificate and hostname checks; a trust-all manager authenticates nothing.

## Why

The java.net.http module documents its hostname-verification switch as "provided for testing purposes only" — the JDK offers the override but marks it as not for production. A trust-all X509TrustManager accepts any certificate presented, so TLS encrypts the channel to whoever is on the other end and a network attacker can impersonate the server without touching the client.

## Bad

```java
import java.security.SecureRandom;
import java.security.cert.X509Certificate;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

class Api {
    SSLContext insecure() throws Exception {
        TrustManager[] trustAll = {new X509TrustManager() {
            public void checkClientTrusted(X509Certificate[] chain, String authType) {
            }

            public void checkServerTrusted(X509Certificate[] chain, String authType) {
            }

            public X509Certificate[] getAcceptedIssuers() {
                return new X509Certificate[0];
            }
        }};
        SSLContext context = SSLContext.getInstance("TLS");
        context.init(null, trustAll, new SecureRandom());
        return context;
    }
}
```

## Good

```java
import java.net.http.HttpClient;

class Api {
    HttpClient client() {
        return HttpClient.newBuilder().build();
    }
}
```

## See Also

- [java-sec-tls-version](sec-tls-version.md) - the protocol version the default client negotiates
