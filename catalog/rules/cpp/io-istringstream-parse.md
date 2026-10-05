---
id: cpp-io-istringstream-parse
lang: cpp
prefix: io
title: Parse fields with an istringstream instead of manual position math
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [parsing, istringstream, fields, validation]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::istringstream]
related: [cpp-io-check-state, cpp-type-parse-at-boundary]
sources:
  - title: cppreference - std::basic_istringstream
    url: https://en.cppreference.com/w/cpp/io/basic_istringstream
  - title: cppreference - std::basic_ios
    url: https://en.cppreference.com/w/cpp/io/basic_ios
---
> Let extraction enforce the shape; find and atoi have no way to fail cleanly.

## Why

`std::istringstream` performs input operations on a string, so a delimited field can be read with `std::getline` and a typed value with extraction, exactly as from any other stream, and the stream state reports whether the expected shape was present. Manual `find` plus `atoi` has no failure channel: a missing delimiter yields `npos`, and the following arithmetic wraps to the start of the line, so the parser silently accepts garbage. The stream operations fail visibly when a field is absent or malformed.

## Bad

```cpp
#include <cstdlib>
#include <string>

int parse_port(const std::string& line) {
    return std::atoi(line.c_str() + line.find(':') + 1); // no validation
}

int main() {
    return parse_port("host:8080");
}
```

## Good

```cpp
#include <sstream>
#include <stdexcept>
#include <string>

int parse_port(const std::string& line) {
    std::istringstream input(line);
    std::string host;
    int port = 0;
    if (!std::getline(input, host, ':') || host.empty() || !(input >> port))
        throw std::invalid_argument("expected host:port");
    return port;
}

int main() {
    return parse_port("host:8080");
}
```

## See Also

- [cpp-io-check-state](io-check-state.md) - reading the stream state the parser relies on
- [cpp-type-parse-at-boundary](type-parse-at-boundary.md) - parsing into validated types
