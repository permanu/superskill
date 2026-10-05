---
id: cpp-sec-no-hardcoded-secrets
lang: cpp
prefix: sec
title: No credentials in source; load them from outside the code
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [credentials, secrets, hardcoded, configuration]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-obs-no-secrets, cpp-sec-error-message-leakage]
sources:
  - title: "CWE-798: Use of Hard-coded Credentials"
    url: https://cwe.mitre.org/data/definitions/798.html
  - title: cppreference - std::getenv
    url: https://en.cppreference.com/w/cpp/utility/program/getenv
---
> A credential in the source is in every repository copy and every binary; inject it at run time.

## Why

CWE-798 covers both directions: a password checked inside the program is identical on every installation, and a key used to reach another service is extractable from the binary. Once the source ships, the secret cannot be rotated without a rebuild, and revocation of a leaked repository copy is impossible. Credentials belong in protected configuration or a secret store, read at run time, so the binary contains only the lookup.

## Bad

```cpp
#include <string>

const std::string kApiToken = "sk-live-51H8x9Q2"; // in the source and the binary

int main() {
    return kApiToken.empty() ? 1 : 0;
}
```

## Good

```cpp
#include <cstdlib>
#include <stdexcept>
#include <string>

std::string api_token() {
    const char* token = std::getenv("SERVICE_API_TOKEN"); // supplied at run time
    if (token == nullptr)
        throw std::runtime_error("SERVICE_API_TOKEN is not set");
    return token;
}

int main() {
    return api_token().empty() ? 1 : 0;
}
```

## See Also

- [cpp-obs-no-secrets](obs-no-secrets.md) - keeping the same values out of logs
- [cpp-sec-error-message-leakage](sec-error-message-leakage.md) - keeping them out of user-facing errors
