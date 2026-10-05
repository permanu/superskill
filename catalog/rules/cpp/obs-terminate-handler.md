---
id: cpp-obs-terminate-handler
lang: cpp
prefix: obs
title: Install a terminate handler that reports the unhandled exception before aborting
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [terminate, unhandled, abort, diagnostics]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::set_terminate]
related: [cpp-obs-exception-what, cpp-err-no-throw-across-c]
sources:
  - title: cppreference - std::set_terminate
    url: https://en.cppreference.com/w/cpp/error/set_terminate
  - title: cppreference - std::exception
    url: https://en.cppreference.com/w/cpp/error/exception
---
> Set a terminate handler that logs the in-flight exception, then aborts deliberately.

## Why

When an exception escapes every handler, the default terminate prints a short message and aborts with no application context: no log line, no cleanup, no idea which request was in flight. `std::set_terminate` installs a function that runs instead; it can recover the in-flight exception with `std::current_exception`, report it, and then abort. The handler must not return, so the abort is explicit.

## Bad

```cpp
#include <stdexcept>

void run() {
    throw std::runtime_error("worker failed");
}

int main() {
    run(); // unhandled: default terminate gives minimal context
}
```

## Good

```cpp
#include <cstdlib>
#include <exception>
#include <iostream>
#include <stdexcept>

void run() {
    throw std::runtime_error("worker failed");
}

int main() {
    std::set_terminate([] {
        if (const std::exception_ptr current = std::current_exception()) {
            try {
                std::rethrow_exception(current);
            } catch (const std::exception& e) {
                std::cerr << "terminating: " << e.what() << '\n';
            }
        }
        std::abort();
    });
    run();
}
```

## See Also

- [cpp-obs-exception-what](obs-exception-what.md) - the message the handler reports
- [cpp-err-no-throw-across-c](err-no-throw-across-c.md) - boundaries where termination must not happen
