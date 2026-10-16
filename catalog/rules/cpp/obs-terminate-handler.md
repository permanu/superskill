---
id: cpp-obs-terminate-handler
lang: cpp
prefix: obs
title: Keep termination diagnostics fixed and avoid dumping exception state
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [terminate, unhandled, abort, diagnostics]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::set_terminate]
related: [shared-obs-allowlisted-diagnostics, cpp-obs-exception-what, cpp-err-no-throw-across-c]
sources:
  - title: C++ draft - Termination
    url: https://eel.is/c++draft/exception.terminate
  - title: C++ draft - Start and termination
    url: https://eel.is/c++draft/support.start.term
  - title: cppreference - std::_Exit
    url: https://en.cppreference.com/w/cpp/utility/program/_Exit
  - title: OWASP Logging Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  - title: cppreference - std::set_terminate
    url: https://en.cppreference.com/w/cpp/error/set_terminate
  - title: cppreference - std::exception
    url: https://en.cppreference.com/w/cpp/error/exception
---
> Make termination diagnostics best-effort and fixed; terminate without serializing exception state or requesting a core dump.

## Why

A termination path cannot rely on normal recovery, object destruction or safe serialization of arbitrary exception state. A fixed diagnostic avoids leaking messages or causes, while `_Exit` terminates without stack unwinding or requesting the core dump associated with `abort`. The diagnostic remains best-effort and can be lost; configure OS crash collection and process supervision separately.

## Bad

```cpp
#include <stdexcept>

void run() {
    throw std::runtime_error("worker failed");
}

int main() {
    run(); // default termination can expose exception text and request a core dump
}
```

## Good

```cpp
#include <cstdlib>
#include <cstdio>
#include <exception>
#include <stdexcept>

void run() {
    throw std::runtime_error("worker failed");
}

int main() {
    std::set_terminate([] {
        std::fputs("process.terminate\n", stderr);
        std::_Exit(EXIT_FAILURE);
    });
    run();
}
```

## See Also

- [cpp-obs-exception-what](obs-exception-what.md) - bounded failure classifications
- [cpp-err-no-throw-across-c](err-no-throw-across-c.md) - boundaries where termination must not happen
