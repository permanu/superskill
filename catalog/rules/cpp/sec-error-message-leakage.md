---
id: cpp-sec-error-message-leakage
lang: cpp
prefix: sec
title: User-facing errors stay generic; details go to the log
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [errors, leakage, diagnostics, user-facing]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::exception]
related: [cpp-sec-no-hardcoded-secrets, cpp-obs-report-once]
sources:
  - title: "CWE-209: Generation of Error Message Containing Sensitive Information"
    url: https://cwe.mitre.org/data/definitions/209.html
  - title: cppreference - std::exception
    url: https://en.cppreference.com/w/cpp/error/exception
---
> Return a generic failure to the user; write the path, query, and message to the log.

## Why

An error string written for a developer carries the server's directory layout, configuration file names, or query text; CWE-209 records how attackers use exactly that detail to aim the next request, including choosing the number of `..` sequences a traversal needs. The user needs to know the operation failed and what to do next; the operator needs the full message. Splitting the two audiences keeps diagnostics without handing an attacker a map.

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
    } catch (const std::exception& e) {
        std::cerr << "internal: " << e.what() << '\n';   // detail to the log
        std::cout << "the request failed\n";            // generic to the user
    }
}

int main() {
    serve("alice");
}
```

## See Also

- [cpp-sec-no-hardcoded-secrets](sec-no-hardcoded-secrets.md) - the values this rule keeps out of replies
- [cpp-obs-report-once](obs-report-once.md) - the single place that writes the detailed entry
