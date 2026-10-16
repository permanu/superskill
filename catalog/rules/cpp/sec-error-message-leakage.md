---
id: cpp-sec-error-message-leakage
lang: cpp
prefix: sec
title: Map C++ exceptions to generic responses at request boundaries
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [errors, leakage, diagnostics, user-facing]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::exception]
related: [shared-obs-allowlisted-diagnostics, cpp-sec-no-hardcoded-secrets, cpp-obs-report-once]
sources:
  - title: OWASP Logging Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  - title: "CWE-209: Generation of Error Message Containing Sensitive Information"
    url: https://cwe.mitre.org/data/definitions/209.html
  - title: cppreference - std::exception
    url: https://en.cppreference.com/w/cpp/error/exception
---
> Translate caught C++ exceptions into generic client responses; use only reviewed event fields for the accompanying diagnostic.

## Why

An exception can carry internal paths, SQL parameters, credentials or personal data. Moving it from the response to a durable log changes the audience but does not remove the disclosure. Use approved error codes and static event identities in both boundaries, with separately controlled operational investigation rather than automatic raw-message export.

## Bad

```cpp
#include <iostream>
#include <stdexcept>
#include <string>

void serve(const std::string& user) {
    try {
        throw std::runtime_error("/srv/config/db.ini: permission denied");
    } catch (const std::exception& e) {
        std::cout << "error: " << e.what() << '\n'; // internals reach the user
    }
}

int main() {
    serve("alice");
}
```

## Good

```cpp
#include <iostream>
#include <stdexcept>
#include <string>

void serve(const std::string& user) {
    try {
        throw std::runtime_error("/srv/config/db.ini: permission denied");
    } catch (const std::exception&) {
        std::cerr << "request.failed code=OPERATION_FAILED\n";
        std::cout << "the request failed; contact support\n";
    }
}

int main() {
    serve("alice");
}
```

## See Also

- [cpp-sec-no-hardcoded-secrets](sec-no-hardcoded-secrets.md) - the values this rule keeps out of replies
- [cpp-obs-report-once](obs-report-once.md) - the single place that writes the approved event
